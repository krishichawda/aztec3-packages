import { ContractAbi } from '../../contract/index.js';
export default new ContractAbi([
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "who",
        "type": "address"
      },
      {
        "name": "myValue",
        "type": "uint256"
      }
    ]
  },
  {
    "constant": false,
    "inputs": [
      {
        "components": [
          {
            "name": "status",
            "type": "bool"
          }
        ],
        "name": "nestedStruct",
        "type": "tuple"
      }
    ],
    "name": "addStruct",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "name": "listOfNestedStructs",
    "outputs": [
      {
        "components": [
          {
            "name": "status",
            "type": "bool"
          }
        ],
        "name": "nestedStruct",
        "type": "tuple"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "name": "balance",
    "type": "function",
    "inputs": [
      {
        "name": "who",
        "type": "address"
      }
    ],
    "constant": true,
    "outputs": [
      {
        "name": "value",
        "type": "uint256"
      }
    ]
  },
  {
    "name": "hasALotOfParams",
    "inputs": [
      {
        "name": "_var1",
        "type": "uint8"
      },
      {
        "name": "_var2",
        "type": "string"
      },
      {
        "name": "_var3",
        "type": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "name": "owner",
        "type": "address"
      }
    ],
    "constant": false,
    "payable": false,
    "type": "function"
  },
  {
    "name": "getStr",
    "type": "function",
    "inputs": [],
    "constant": true,
    "outputs": [
      {
        "name": "myString",
        "type": "string"
      }
    ]
  },
  {
    "name": "owner",
    "type": "function",
    "inputs": [],
    "constant": true,
    "outputs": [
      {
        "name": "owner",
        "type": "address"
      }
    ]
  },
  {
    "name": "mySend",
    "type": "function",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "myDisallowedSend",
    "type": "function",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "payable": false
  },
  {
    "name": "testArr",
    "type": "function",
    "inputs": [
      {
        "name": "value",
        "type": "int[]"
      }
    ],
    "constant": true,
    "outputs": [
      {
        "name": "d",
        "type": "int"
      }
    ]
  },
  {
    "name": "Changed",
    "type": "event",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "t1",
        "type": "uint256",
        "indexed": false
      },
      {
        "name": "t2",
        "type": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "name": "Unchanged",
    "type": "event",
    "inputs": [
      {
        "name": "value",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "addressFrom",
        "type": "address",
        "indexed": true
      },
      {
        "name": "t1",
        "type": "uint256",
        "indexed": false
      }
    ]
  },
  {
    "name": "overloadedFunction",
    "type": "function",
    "inputs": [
      {
        "name": "a",
        "type": "uint256"
      }
    ],
    "constant": true,
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view"
  },
  {
    "name": "overloadedFunction",
    "type": "function",
    "inputs": [],
    "constant": true,
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view"
  }
]);