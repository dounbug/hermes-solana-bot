const solanaWeb3 = require('@solana/web3.js');
const searchAddress = 'DvvWmWJZW4G1nka2oeUfFyhTWDmWdz2MUQsz7FztHutE';
//'4Be9CvxqHW6BYiRAxW9Q3xu1ycTMWaL5z8NX4HR3ha7t'; 
const endpoint = 'https://soft-skilled-lake.solana-mainnet.quiknode.pro/58f1582aa11c49fc7123ed0dacf0a7592aebea8b/'
const solanaConnection = new solanaWeb3.Connection(endpoint);

const getTransactions = async(address, numTx) => {
    const pubKey = new solanaWeb3.PublicKey(address);
    let transactionList = await solanaConnection.getSignaturesForAddress(pubKey, {limit:numTx});

     //Add this code
     let signatureList = transactionList.map(transaction=>transaction.signature);
     let transactionDetails = await solanaConnection.getParsedTransactions(signatureList, {maxSupportedTransactionVersion:0});
     //--END of new code 

    transactionList.forEach((transaction, i) => {
        const date = new Date(transaction.blockTime*1000);
        const transactionInstructions = transactionDetails[i].transaction.message.instructions;


        console.log(`Transaction No: ${i+1}`);
        console.log(`Signature: ${transaction.signature}`);
        console.log(`Time: ${date}`);
        console.log(`Status: ${transaction.confirmationStatus}`);
        transactionInstructions.forEach((instruction, n)=>{
            console.log(`---Instructions ${n+1}: ${instruction.programId.toString()}`);
        })
        console.log(("-").repeat(20));
    })
}

getTransactions(searchAddress,10);


