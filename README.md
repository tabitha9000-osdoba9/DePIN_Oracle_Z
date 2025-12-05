# Confidential Decentralized Physical Infrastructure Network (DePIN) Data Oracle

This project is a cutting-edge Confidential Decentralized Physical Infrastructure Network (DePIN) Data Oracle that leverages **Zama's Fully Homomorphic Encryption (FHE) technology** to ensure the utmost privacy for data inputs and outputs. By allowing DePIN devices, such as sensors, to securely submit encrypted data, it enables on-chain aggregation computations that protect the privacy of data sources. 

## The Problem We're Solving

In an interconnected world saturated with devices, transmitting and processing sensitive data raises significant privacy concerns. Traditional data-sharing mechanisms often expose sensitive information, creating vulnerabilities for businesses and individuals alike. Data providers face challenges in sharing information without risking exposure of proprietary or personal data. This uncertainty can stifle innovation and deter investment in new technologies, particularly in sectors leveraging IoT (Internet of Things).

## Enter the FHE Solution

Our solution employs **Fully Homomorphic Encryption** to address these pressing issues. By utilizing Zama's open-source libraries such as **Concrete** or the **Zama FHE SDK**, we can perform computations on encrypted data without decrypting it, thus preserving privacy throughout the entire process. This means that data consumers can obtain processed results—such as averages or sums—without ever accessing the original data, effectively shielding sensitive location and commercial information.

## Core Functionalities

### 🔑 Key Features:
- **Device-side FHE Data Upload**: Devices can securely upload encrypted data using FHE, ensuring data privacy at the source.
- **Homomorphic Aggregation Functions**: Implementations of functions like summation and averaging directly on encrypted data.
- **Privacy-preserving Results**: Data consumers receive aggregated outcomes without needing access to the underlying data, thereby protecting both personal and commercial information.
- **Integration with GIS**: Combines Geographic Information Systems (GIS) with a data dashboard for seamless data visualization and analysis.

## Technology Stack

- **Zama FHE SDK**: The core component for implementing homomorphic encryption.
- **Node.js**: Enabling a robust JavaScript environment for our backend.
- **Hardhat**: For Ethereum smart contract development and testing.
- **Solidity**: The programming language used for smart contracts.

## Directory Structure

Here's how the project's files and directories are organized:

```
/DePIN_Oracle_Z
│
├── contracts
│   └── DePIN_Oracle.sol
│
├── src
│   ├── index.js
│   └── dataHandler.js
│
├── scripts
│   └── deploy.js
│
├── test
│   └── DePIN_Oracle.test.js
│
└── package.json
```

## Installation Instructions

To get started with the DePIN Data Oracle, follow these installation steps:

1. Ensure you have **Node.js** installed on your machine. You can check that with:
   ```bash
   node -v
   ```
   
2. Navigate to the project directory you have downloaded.

3. Install the necessary dependencies, including Zama's libraries, by running the following command:
   ```bash
   npm install
   ```

**Note:** Please refrain from using `git clone` or any URLs to download this project. Always ensure you have the right files on your local machine before proceeding.

## Build & Run Guide

To compile and run the project, execute the following commands in your terminal:

1. Compile the smart contracts using Hardhat:
   ```bash
   npx hardhat compile
   ```

2. Deploy the contracts to the local blockchain:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. Run tests to ensure everything is functioning correctly:
   ```bash
   npx hardhat test
   ```

### Code Example

Here’s a simple example to illustrate how you could use our DePIN Oracle in a JavaScript environment:

```javascript
const { encryptData, aggregateEncryptedData } = require('./dataHandler');

// Simulate device data
const deviceData = [10, 20, 30];

// Encrypt and upload data
const encryptedData = deviceData.map(data => encryptData(data));

// Perform homomorphic aggregation on the encrypted data
const aggregatedResult = aggregateEncryptedData(encryptedData);

console.log(`The aggregated value is: ${aggregatedResult}`);
```

## Acknowledgements

### Powered by Zama

We extend our sincere gratitude to the Zama team for their pioneering work in the field of Fully Homomorphic Encryption and for their open-source tools that empower developers to build confidential blockchain applications. Your innovative technologies make it possible for us to provide secure, private solutions in the rapidly evolving world of decentralized infrastructure.

---

With the DePIN Data Oracle, we bridge the gap between IoT data needs and privacy concerns. By harnessing the power of Zama's FHE technology, we provide a solution that upholds the integrity and confidentiality of sensitive information, driving innovation forward in the DePIN and IoT sectors.
