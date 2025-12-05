pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract DePINOracleFHE is SepoliaConfig {
    using FHE for euint32;
    using FHE for ebool;

    error NotOwner();
    error NotProvider();
    error Paused();
    error CooldownActive();
    error BatchNotOpen();
    error BatchAlreadyClosed();
    error ReplayDetected();
    error StateMismatch();
    error InvalidBatchId();
    error InvalidParameter();

    event ProviderAdded(address indexed provider);
    event ProviderRemoved(address indexed provider);
    event PausedContract();
    event UnpausedContract();
    event CooldownChanged(uint256 oldCooldown, uint256 newCooldown);
    event BatchOpened(uint256 indexed batchId);
    event BatchClosed(uint256 indexed batchId);
    event DataSubmitted(address indexed provider, uint256 indexed batchId, bytes32 encryptedData);
    event DecryptionRequested(uint256 indexed requestId, uint256 indexed batchId, bytes32 stateHash);
    event DecryptionCompleted(uint256 indexed requestId, uint256 indexed batchId, uint256 sum, uint256 count);

    struct DecryptionContext {
        uint256 batchId;
        bytes32 stateHash;
        bool processed;
    }

    mapping(address => bool) public providers;
    mapping(address => uint256) public lastSubmissionTime;
    mapping(address => uint256) public lastDecryptionRequestTime;
    mapping(uint256 => euint32) public encryptedSums;
    mapping(uint256 => euint32) public encryptedCounts;
    mapping(uint256 => bool) public batchOpenStatus;
    mapping(uint256 => DecryptionContext) public decryptionContexts;

    address public owner;
    bool public paused;
    uint256 public cooldownSeconds;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProvider() {
        if (!providers[msg.sender]) revert NotProvider();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    constructor() {
        owner = msg.sender;
        cooldownSeconds = 60; 
    }

    function addProvider(address _provider) external onlyOwner {
        providers[_provider] = true;
        emit ProviderAdded(_provider);
    }

    function removeProvider(address _provider) external onlyOwner {
        providers[_provider] = false;
        emit ProviderRemoved(_provider);
    }

    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit PausedContract();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit UnpausedContract();
    }

    function setCooldownSeconds(uint256 _cooldownSeconds) external onlyOwner {
        if (_cooldownSeconds == 0) revert InvalidParameter();
        emit CooldownChanged(cooldownSeconds, _cooldownSeconds);
        cooldownSeconds = _cooldownSeconds;
    }

    function openBatch(uint256 _batchId) external onlyOwner whenNotPaused {
        if (batchOpenStatus[_batchId]) revert BatchAlreadyClosed(); 
        batchOpenStatus[_batchId] = true;
        emit BatchOpened(_batchId);
    }

    function closeBatch(uint256 _batchId) external onlyOwner whenNotPaused {
        if (!batchOpenStatus[_batchId]) revert BatchNotOpen();
        batchOpenStatus[_batchId] = false;
        emit BatchClosed(_batchId);
    }

    function submitData(uint256 _batchId, bytes32 _encryptedValue) external onlyProvider whenNotPaused {
        if (block.timestamp < lastSubmissionTime[msg.sender] + cooldownSeconds) {
            revert CooldownActive();
        }
        if (!batchOpenStatus[_batchId]) revert BatchNotOpen();

        lastSubmissionTime[msg.sender] = block.timestamp;
        euint32 encryptedValue = FHE.asEuint32(_encryptedValue);
        _initIfNeeded(_batchId);

        encryptedSums[_batchId] = encryptedSums[_batchId].add(encryptedValue);
        encryptedCounts[_batchId] = encryptedCounts[_batchId].add(FHE.asEuint32(1)); 

        emit DataSubmitted(msg.sender, _batchId, _encryptedValue);
    }

    function requestBatchAggregation(uint256 _batchId) external whenNotPaused {
        if (block.timestamp < lastDecryptionRequestTime[msg.sender] + cooldownSeconds) {
            revert CooldownActive();
        }
        if (batchOpenStatus[_batchId]) revert BatchNotOpen(); 

        lastDecryptionRequestTime[msg.sender] = block.timestamp;

        euint32 sum = encryptedSums[_batchId];
        euint32 count = encryptedCounts[_batchId];

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = sum.toBytes32();
        cts[1] = count.toBytes32();

        bytes32 stateHash = _hashCiphertexts(cts);
        uint256 requestId = FHE.requestDecryption(cts, this.myCallback.selector);

        decryptionContexts[requestId] = DecryptionContext({ batchId: _batchId, stateHash: stateHash, processed: false });
        emit DecryptionRequested(requestId, _batchId, stateHash);
    }

    function myCallback(uint256 requestId, bytes memory cleartexts, bytes memory proof) public {
        if (decryptionContexts[requestId].processed) revert ReplayDetected();

        uint256 batchId = decryptionContexts[requestId].batchId;
        euint32 sum = encryptedSums[batchId];
        euint32 count = encryptedCounts[batchId];

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = sum.toBytes32();
        cts[1] = count.toBytes32();

        bytes32 currentHash = _hashCiphertexts(cts);
        if (currentHash != decryptionContexts[requestId].stateHash) {
            revert StateMismatch();
        }

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint256 sumCleartext = abi.decode(cleartexts, (uint256));
        uint256 countCleartext = abi.decode(cleartexts[32:], (uint256));

        decryptionContexts[requestId].processed = true;
        emit DecryptionCompleted(requestId, batchId, sumCleartext, countCleartext);
    }

    function _hashCiphertexts(bytes32[] memory cts) internal pure returns (bytes32) {
        return keccak256(abi.encode(cts, address(this)));
    }

    function _initIfNeeded(uint256 _batchId) internal {
        if (!FHE.isInitialized(encryptedSums[_batchId])) {
            encryptedSums[_batchId] = FHE.asEuint32(0);
        }
        if (!FHE.isInitialized(encryptedCounts[_batchId])) {
            encryptedCounts[_batchId] = FHE.asEuint32(0);
        }
    }
}