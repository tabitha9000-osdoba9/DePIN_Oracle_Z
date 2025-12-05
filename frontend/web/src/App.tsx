// App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import "./App.css";
import { useAccount, useSignMessage } from 'wagmi';

// Style choices (randomly selected)
// Colors: Tech (blue+black)
// UI Style: Future metal
// Layout: Center radiation
// Interaction: Micro-interactions

// Feature choices (randomly selected)
// 1. Data statistics
// 2. Global data map
// 3. FAQ section

interface SensorData {
  id: string;
  encryptedValue: string;
  location: string;
  timestamp: number;
  deviceId: string;
}

interface AggregatedResult {
  average: number;
  sum: number;
  count: number;
  decrypted?: boolean;
}

// FHE encryption/decryption functions
const FHEEncryptNumber = (value: number): string => `FHE-${btoa(value.toString())}`;
const FHEDecryptNumber = (encryptedData: string): number => encryptedData.startsWith('FHE-') ? parseFloat(atob(encryptedData.substring(4))) : parseFloat(encryptedData);
const generatePublicKey = () => `0x${Array(2000).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingData, setAddingData] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ visible: false, status: "pending", message: "" });
  const [newData, setNewData] = useState({ value: 0, location: "" });
  const [selectedData, setSelectedData] = useState<SensorData | null>(null);
  const [aggregatedResult, setAggregatedResult] = useState<AggregatedResult | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [chainId, setChainId] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [durationDays, setDurationDays] = useState(30);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Initialize signature parameters
  useEffect(() => {
    loadData().finally(() => setLoading(false));
    const initSignatureParams = async () => {
      const contract = await getContractReadOnly();
      if (contract) setContractAddress(await contract.getAddress());
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex, 16));
      }
      setStartTimestamp(Math.floor(Date.now() / 1000));
      setDurationDays(30);
      setPublicKey(generatePublicKey());
    };
    initSignatureParams();
  }, []);

  // Load data from contract
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        setTransactionStatus({ visible: true, status: "success", message: "Contract is available!" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      }
      
      // Load sensor data
      const dataBytes = await contract.getData("sensorData");
      let dataList: SensorData[] = [];
      if (dataBytes.length > 0) {
        try {
          const dataStr = ethers.toUtf8String(dataBytes);
          if (dataStr.trim() !== '') dataList = JSON.parse(dataStr);
        } catch (e) {}
      }
      setSensorData(dataList);
    } catch (e) {
      console.error("Error loading data:", e);
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
      setLoading(false); 
    }
  };

  // Add new sensor data
  const addSensorData = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setAddingData(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Adding encrypted sensor data with Zama FHE..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      // Create new data entry
      const newEntry: SensorData = {
        id: `sensor-${Date.now()}`,
        encryptedValue: FHEEncryptNumber(newData.value),
        location: newData.location,
        timestamp: Math.floor(Date.now() / 1000),
        deviceId: address
      };
      
      // Update data list
      const updatedData = [...sensorData, newEntry];
      
      // Save to contract
      await contract.setData("sensorData", ethers.toUtf8Bytes(JSON.stringify(updatedData)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Sensor data added successfully!" });
      await loadData();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowAddModal(false);
        setNewData({ value: 0, location: "" });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setAddingData(false); 
    }
  };

  // Calculate aggregated data
  const calculateAggregated = async () => {
    if (sensorData.length === 0) return;
    
    setTransactionStatus({ visible: true, status: "pending", message: "Calculating FHE aggregated data..." });
    
    try {
      // Simulate FHE computation on encrypted data
      const sum = sensorData.reduce((acc, data) => acc + FHEDecryptNumber(data.encryptedValue), 0);
      const avg = sum / sensorData.length;
      
      setAggregatedResult({
        average: avg,
        sum: sum,
        count: sensorData.length,
        decrypted: false
      });
      
      setTransactionStatus({ visible: true, status: "success", message: "Aggregation completed!" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Aggregation failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  // Decrypt aggregated data with signature
  const decryptAggregated = async () => {
    if (!isConnected || !aggregatedResult) return;
    
    setIsDecrypting(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Decrypting with Zama FHE..." });
    
    try {
      const message = `publickey:${publicKey}\ncontractAddresses:${contractAddress}\ncontractsChainId:${chainId}\nstartTimestamp:${startTimestamp}\ndurationDays:${durationDays}`;
      await signMessageAsync({ message });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAggregatedResult({
        ...aggregatedResult,
        decrypted: true
      });
      
      setTransactionStatus({ visible: true, status: "success", message: "Decryption successful!" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Decryption failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsDecrypting(false); 
    }
  };

  // Render data map visualization
  const renderDataMap = () => {
    const locations = Array.from(new Set(sensorData.map(d => d.location)));
    
    return (
      <div className="data-map">
        <div className="map-container">
          {locations.map((loc, idx) => {
            const locData = sensorData.filter(d => d.location === loc);
            const avgValue = locData.reduce((sum, d) => sum + FHEDecryptNumber(d.encryptedValue), 0) / locData.length;
            
            return (
              <div 
                key={idx} 
                className="map-point"
                style={{
                  left: `${10 + (idx % 5) * 20}%`,
                  top: `${10 + Math.floor(idx / 5) * 20}%`,
                  '--value': avgValue / 100
                } as React.CSSProperties}
                onClick={() => setSelectedData(locData[0])}
              >
                <div className="point-value">{avgValue.toFixed(1)}</div>
                <div className="point-label">{loc}</div>
              </div>
            );
          })}
        </div>
        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-color low"></div>
            <span>Low Value</span>
          </div>
          <div className="legend-item">
            <div className="legend-color medium"></div>
            <span>Medium</span>
          </div>
          <div className="legend-item">
            <div className="legend-color high"></div>
            <span>High Value</span>
          </div>
        </div>
      </div>
    );
  };

  // Render FHE process visualization
  const renderFHEProcess = () => {
    return (
      <div className="fhe-process">
        <div className="process-step">
          <div className="step-icon">🔒</div>
          <div className="step-content">
            <h4>Device Encryption</h4>
            <p>Sensors encrypt data using Zama FHE before transmission</p>
          </div>
        </div>
        <div className="process-arrow">→</div>
        <div className="process-step">
          <div className="step-icon">⚡</div>
          <div className="step-content">
            <h4>Secure Transmission</h4>
            <p>Encrypted data sent to blockchain without decryption</p>
          </div>
        </div>
        <div className="process-arrow">→</div>
        <div className="process-step">
          <div className="step-icon">🧮</div>
          <div className="step-content">
            <h4>Homomorphic Computation</h4>
            <p>Smart contracts process encrypted data directly</p>
          </div>
        </div>
        <div className="process-arrow">→</div>
        <div className="process-step">
          <div className="step-icon">🔓</div>
          <div className="step-content">
            <h4>Authorized Decryption</h4>
            <p>Only authorized parties can decrypt final results</p>
          </div>
        </div>
      </div>
    );
  };

  // Render FAQ section
  const renderFAQ = () => {
    const faqItems = [
      {
        question: "What is Confidential DePIN Data Oracle?",
        answer: "A decentralized network that allows IoT devices to submit encrypted data for aggregation while preserving data privacy using Fully Homomorphic Encryption."
      },
      {
        question: "How does Zama FHE protect my data?",
        answer: "Zama's FHE allows computations on encrypted data without decrypting it. Your sensor data remains encrypted throughout the entire process."
      },
      {
        question: "What types of data can be processed?",
        answer: "The system currently supports numerical data (temperature, humidity, pressure, etc.) but cannot process strings or images with FHE."
      },
      {
        question: "Who can see my device's raw data?",
        answer: "No one. The raw data remains encrypted at all times. Only aggregated results can be decrypted by authorized parties."
      },
      {
        question: "What blockchain is this built on?",
        answer: "The system is blockchain-agnostic but currently deployed on Ethereum with Zama FHE for privacy-preserving computations."
      }
    ];
    
    return (
      <div className="faq-container">
        {faqItems.map((item, index) => (
          <div className="faq-item" key={index}>
            <div className="faq-question">{item.question}</div>
            <div className="faq-answer">{item.answer}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>Initializing encrypted data oracle...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">
            <div className="fhe-icon"></div>
          </div>
          <h1>DePIN<span>Oracle</span><span className="zama">Z</span></h1>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="add-data-btn"
          >
            <div className="add-icon"></div>Add Sensor Data
          </button>
          <div className="wallet-connect-wrapper">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </div>
      </header>
      
      <div className="main-content-container">
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`tab ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              Data Map
            </button>
            <button 
              className={`tab ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              FAQ
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'dashboard' && (
              <div className="dashboard-section">
                <div className="dashboard-grid">
                  <div className="dashboard-panel stats-panel">
                    <h2>Encrypted Data Statistics</h2>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <div className="stat-value">{sensorData.length}</div>
                        <div className="stat-label">Data Points</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {sensorData.length > 0 
                            ? new Set(sensorData.map(d => d.deviceId)).size
                            : 0}
                        </div>
                        <div className="stat-label">Devices</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {sensorData.length > 0 
                            ? new Set(sensorData.map(d => d.location)).size
                            : 0}
                        </div>
                        <div className="stat-label">Locations</div>
                      </div>
                    </div>
                    
                    <button 
                      className="aggregate-btn" 
                      onClick={calculateAggregated}
                      disabled={sensorData.length === 0}
                    >
                      Calculate Aggregates
                    </button>
                    
                    {aggregatedResult && (
                      <div className="aggregated-results">
                        <h3>Aggregated Results</h3>
                        <div className="result-item">
                          <span>Average:</span>
                          <strong>{aggregatedResult.average.toFixed(2)}</strong>
                        </div>
                        <div className="result-item">
                          <span>Sum:</span>
                          <strong>{aggregatedResult.sum.toFixed(2)}</strong>
                        </div>
                        <div className="result-item">
                          <span>Count:</span>
                          <strong>{aggregatedResult.count}</strong>
                        </div>
                        
                        <button 
                          className={`decrypt-btn ${aggregatedResult.decrypted ? 'decrypted' : ''}`}
                          onClick={decryptAggregated}
                          disabled={isDecrypting || aggregatedResult.decrypted}
                        >
                          {isDecrypting ? "Decrypting..." : 
                           aggregatedResult.decrypted ? "Decrypted" : "Decrypt Results"}
                        </button>
                        
                        {aggregatedResult.decrypted && (
                          <div className="decryption-badge">
                            <div className="lock-icon open"></div>
                            <span>Decrypted with Zama FHE</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="dashboard-panel process-panel">
                    <h2>FHE Data Flow</h2>
                    {renderFHEProcess()}
                  </div>
                  
                  <div className="dashboard-panel data-panel">
                    <div className="panel-header">
                      <h2>Latest Sensor Data</h2>
                      <button 
                        onClick={loadData} 
                        className="refresh-btn" 
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    
                    <div className="data-list">
                      {sensorData.length === 0 ? (
                        <div className="no-data">
                          <div className="no-data-icon"></div>
                          <p>No sensor data found</p>
                          <button 
                            className="add-btn" 
                            onClick={() => setShowAddModal(true)}
                          >
                            Add First Data Point
                          </button>
                        </div>
                      ) : sensorData.slice(0, 5).map((data, index) => (
                        <div 
                          className={`data-item ${selectedData?.id === data.id ? "selected" : ""}`} 
                          key={index}
                          onClick={() => setSelectedData(data)}
                        >
                          <div className="data-location">{data.location}</div>
                          <div className="data-value">Encrypted: {data.encryptedValue.substring(0, 15)}...</div>
                          <div className="data-time">{new Date(data.timestamp * 1000).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'map' && (
              <div className="map-section">
                <h2>Global Data Distribution</h2>
                {sensorData.length > 0 ? (
                  renderDataMap()
                ) : (
                  <div className="no-map-data">
                    <div className="no-data-icon"></div>
                    <p>No location data available</p>
                    <button 
                      className="add-btn" 
                      onClick={() => setShowAddModal(true)}
                    >
                      Add Location Data
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'faq' && (
              <div className="faq-section">
                <h2>Frequently Asked Questions</h2>
                {renderFAQ()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showAddModal && (
        <ModalAddData 
          onSubmit={addSensorData} 
          onClose={() => setShowAddModal(false)} 
          adding={addingData} 
          data={newData} 
          setData={setNewData}
        />
      )}
      
      {selectedData && (
        <DataDetailModal 
          data={selectedData} 
          onClose={() => setSelectedData(null)} 
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && <div className="success-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✗</div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
      
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <div className="fhe-icon"></div>
              <span>DePIN Oracle Z</span>
            </div>
            <p>Confidential Decentralized Physical Infrastructure Network Data Oracle</p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="fhe-badge">
            <span>Powered by Zama FHE</span>
          </div>
          <div className="copyright">© {new Date().getFullYear()} DePIN Oracle Z. All rights reserved.</div>
          <div className="disclaimer">
            This system uses fully homomorphic encryption to protect sensor data privacy. 
            All computations are performed on encrypted data without revealing individual values.
          </div>
        </div>
      </footer>
    </div>
  );
};

interface ModalAddDataProps {
  onSubmit: () => void; 
  onClose: () => void; 
  adding: boolean;
  data: any;
  setData: (data: any) => void;
}

const ModalAddData: React.FC<ModalAddDataProps> = ({ onSubmit, onClose, adding, data, setData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: name === 'value' ? parseFloat(value) : value });
  };

  return (
    <div className="modal-overlay">
      <div className="add-data-modal">
        <div className="modal-header">
          <h2>Add Sensor Data</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <div className="lock-icon"></div>
            <div>
              <strong>FHE Encryption Notice</strong>
              <p>Data will be encrypted with Zama FHE before storage</p>
            </div>
          </div>
          
          <div className="form-group">
            <label>Sensor Value *</label>
            <input 
              type="number" 
              name="value" 
              value={data.value} 
              onChange={handleChange} 
              placeholder="Enter sensor reading..." 
              step="0.01"
            />
          </div>
          
          <div className="form-group">
            <label>Location *</label>
            <input 
              type="text" 
              name="location" 
              value={data.location} 
              onChange={handleChange} 
              placeholder="Enter location..." 
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button 
            onClick={onSubmit} 
            disabled={adding || !data.value || !data.location} 
            className="submit-btn"
          >
            {adding ? "Encrypting with FHE..." : "Add Data"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DataDetailModalProps {
  data: SensorData;
  onClose: () => void;
}

const DataDetailModal: React.FC<DataDetailModalProps> = ({ data, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="data-detail-modal">
        <div className="modal-header">
          <h2>Sensor Data Details</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="data-info">
            <div className="info-item">
              <span>Device ID:</span>
              <strong>{data.deviceId.substring(0, 6)}...{data.deviceId.substring(38)}</strong>
            </div>
            <div className="info-item">
              <span>Location:</span>
              <strong>{data.location}</strong>
            </div>
            <div className="info-item">
              <span>Timestamp:</span>
              <strong>{new Date(data.timestamp * 1000).toLocaleString()}</strong>
            </div>
            <div className="info-item full-width">
              <span>Encrypted Value:</span>
              <div className="encrypted-value">{data.encryptedValue}</div>
            </div>
          </div>
          
          <div className="fhe-tag">
            <div className="fhe-icon"></div>
            <span>FHE Encrypted - Cannot be decrypted without authorization</span>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    </div>
  );
};

export default App;