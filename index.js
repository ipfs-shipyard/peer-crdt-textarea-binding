var async = require('async')
var XIPFS = require('ipfs')
var PeerCRDT = require('peer-crdt')
var PeerCRDTIPFS = require('peer-crdt-ipfs')
var RTT = require('realtime-text')

const Store = require('peer-crdt/test/helpers/store')
const Network = require('peer-crdt/test/helpers/network')
const encrypt = require('peer-crdt/test/helpers/encrypt')
const decrypt = require('peer-crdt/test/helpers/decrypt')

var TextareaBinding = require('./TextareaBinding')


var ipfs = new XIPFS({
  EXPERIMENTAL: {
    pubsub: true
  }, config:  {
    Addresses: {
      Swarm: [
        '/dns4/protocol.andyet.net/tcp/9090/ws/p2p-websocket-star'
      ]
    },
    Bootstrap: []
  }
})
var crdtipfs = PeerCRDTIPFS(ipfs)

var crdt = PeerCRDT.defaults({
    ...crdtipfs,
    signAndEncrypt: encrypt,
    decryptAndVerify: decrypt
})

window.crdt = crdt

var data = crdt.create('treedoc-text', window.location.hash.substr(1) || 'something5')
window.data = data



function setup() {
  var textarea = document.getElementById('input-area')

  window.binding = new TextareaBinding(data, textarea)
}

data.network.start().then(setup)

