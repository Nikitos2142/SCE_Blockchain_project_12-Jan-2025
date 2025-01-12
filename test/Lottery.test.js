const assert = require('assert');
const ganache = require('ganache');
const {Web3, eth} = require('web3');
const web3 = new Web3(ganache.provider());
const { interface, bytecode } = require("../compile");

// Local variables
let accounts;
let lottery;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    lottery = await new web3.eth.Contract(JSON.parse(interface))
        .deploy({
            data: bytecode,
            arguments: ["New York Law", "New York State Courts", accounts[1]], // Add governance details
        })
        .send({ from: accounts[0], gas: "1000000" });
});

describe("Lottery Contract with Legal Integration", () => {

    // Original Tests
    it("deploys a contract", () => {
        assert.ok(lottery.options.address);
    });

    it("allows one account to enter", async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei("0.02", "ether"),
        });
        const players = await lottery.methods.getPlayers().call({
            from: accounts[0],
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it("allows multiple accounts to enter", async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei("0.02", "ether"),
        });
        await lottery.methods.enter().send({
            from: accounts[1],
            value: web3.utils.toWei("0.02", "ether"),
        });
        await lottery.methods.enter().send({
            from: accounts[2],
            value: web3.utils.toWei("0.02", "ether"),
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0],
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it("requires a minimum amount of ether to enter", async () => {
        try {
            await lottery.methods.enter().send({
                from: accounts[0],
                value: 0,
            });
            assert(false);
        } catch (error) {
            assert.ok(error);
        }
    });

    it("only manager can pick the winner", async () => {
        try {
            await lottery.methods.pickWinner().send({
                from: accounts[1],
            });
            assert(false);
        } catch (error) {
            assert.ok(error);
        }
    });

    it("sends money to the winner and resets the players array", async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei("2", "ether"),
        });

        const initialBalance = await web3.eth.getBalance(accounts[0]);
        await lottery.methods.pickWinner().send({ from: accounts[0] });

        const finalBalance = await web3.eth.getBalance(accounts[0]);
        const difference = finalBalance - initialBalance;

        assert(difference > web3.utils.toWei("1.8", "ether"));
    });

    // New Tests for Legal Integration
    it("deploys a contract with governance details", async () => {
        const governingLaw = await lottery.methods.governingLaw().call();
        const jurisdiction = await lottery.methods.jurisdiction().call();
        const arbitrator = await lottery.methods.arbitrator().call();

        assert.equal(governingLaw, "New York Law");
        assert.equal(jurisdiction, "New York State Courts");
        assert.equal(arbitrator, accounts[1]);
    });

    it("allows players to raise a dispute", async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei("0.02", "ether"),
        });

        const reason = "Dispute about entry rules";
        await lottery.methods.raiseDispute(reason).send({
            from: accounts[0],
            gas: "1000000",
        });

        const logs = await web3.eth.getPastLogs({
            fromBlock: 0,
            address: lottery.options.address,
        });

        const disputeLog = logs.find((log) =>
            log.topics.includes(
                web3.utils.keccak256("DisputeRaised(address,string)")
            )
        );

        assert.ok(disputeLog);
    });

    it("only players can raise disputes", async () => {
        try {
            await lottery.methods.raiseDispute("Invalid entry").send({
                from: accounts[2],
                gas: "1000000",
            });
            assert(false);
        } catch (error) {
            assert.ok(error);
        }
    });

    it("logs arbitration decisions", async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei("0.02", "ether"),
        });

        await lottery.methods.pickWinner().send({
            from: accounts[0],
        });

        const logs = await web3.eth.getPastLogs({
            fromBlock: 0,
            address: lottery.options.address,
        });

        const arbitrationLog = logs.find((log) =>
            log.topics.includes(
                web3.utils.keccak256("ArbitrationDecision(address,uint256)")
            )
        );

        assert.ok(arbitrationLog);
    });

    it("ensures only the designated arbitrator can resolve disputes", async () => {
        try {
            await lottery.methods.raiseDispute("Dispute reason").send({
                from: accounts[0],
                gas: "1000000",
            });

            // Attempt to resolve as someone other than the arbitrator
            await lottery.methods.resolveDispute().send({
                from: accounts[2],
                gas: "1000000",
            });
            assert(false);
        } catch (error) {
            assert.ok(error);
        }
    });

    it("allows the arbitrator to resolve disputes and enforce outcomes", async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei("2", "ether"),
        });

        await lottery.methods.raiseDispute("Invalid behavior").send({
            from: accounts[0],
            gas: "1000000",
        });

        // Arbitrator (accounts[1]) logs a resolution
        await lottery.methods.resolveDispute("Winner declared as accounts[0]").send({
            from: accounts[1],
            gas: "1000000",
        });

        const logs = await web3.eth.getPastLogs({
            fromBlock: 0,
            address: lottery.options.address,
        });

        const disputeResolutionLog = logs.find((log) =>
            log.topics.includes(
                web3.utils.keccak256("ArbitrationDecision(address,uint256)")
            )
        );

        assert.ok(disputeResolutionLog);
    });
});

