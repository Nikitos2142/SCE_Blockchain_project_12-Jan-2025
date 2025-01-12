require('dotenv').config({path:'./contracts/.env'});
const HDWalletProvider = require('@truffle/hdwallet-provider');
const { Web3 } = require('web3');
const { interface, bytecode } = require('./compile');

const provider = new HDWalletProvider(
  process.env.MNEM,
  process.env.INFURA_ENDPOINT
);
const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log('Attempting to deploy from account', accounts[0]);

  const result = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode,
              arguments: [
                "Texas Arbitrary Law ", // _governingLaw
                "Arbitrary State of Texas", // _jurisdiction
                "0x17F6AD8Ef982297579C203069C1DbfFE4348c372" // _arbitrator
              ]
     })
    .send({ gas: '1000000', from: accounts[0] });

  console.log(interface);
  console.log("Contract deployed to", result.options.address);
  provider.engine.stop();//prevent hanging deployment
};
deploy();
