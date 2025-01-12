pragma solidity ^0.4.17;

contract Lottery {
    address public manager;
    address[] public players;

    // Off-chain governance details
    string public governingLaw;
    string public jurisdiction;
    address public arbitrator;

    // Event for logging disputes
    event DisputeRaised(address indexed player, string reason);
    event ArbitrationDecision(address indexed winner, uint amount);

    function Lottery(string _governingLaw, string _jurisdiction, address _arbitrator) public {
        manager = msg.sender;
        governingLaw = _governingLaw;
        jurisdiction = _jurisdiction;
        arbitrator = _arbitrator;
    }

    function enter() public payable {
        require(msg.value > .01 ether);
        players.push(msg.sender);
    }

    function random() private view returns (uint) {
        return uint(keccak256(block.difficulty, now, players));
    }

    function pickWinner() public restricted {
        uint index = random() % players.length;
        uint balance = address(this).balance;

        // Log the winner for off-chain record
        emit ArbitrationDecision(players[index], balance);

        // Transfer the balance to the winner
        players[index].transfer(balance);

        // Reset the players array
        players = new address[](0);
    }

    modifier restricted() {
        require(msg.sender == manager);
        _;
    }

    function getPlayers() public view returns (address[]) {
        return players;
    }



    // Raise a dispute (off-chain resolution)
    function raiseDispute(string reason) public {
        require(isPlayer(msg.sender));
        emit DisputeRaised(msg.sender, reason);
    }

    function isPlayer(address _address) private view returns (bool) {
        for (uint i = 0; i < players.length; i++) {
            if (players[i] == _address) {
                return true;
            }
        }
        return false;
    }

     // Resolve disputes (arbitrator function)
    function resolveDispute(string memory resolution) public {
        require(msg.sender == arbitrator, "Only the arbitrator can resolve disputes");
        // This is a placeholder for dispute resolution logic
        emit ArbitrationDecision(address(0), 0); // Log a generic resolution for now
    }
}
  










































































































