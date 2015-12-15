var fs = require('fs')
var falafel = require('falafel')
var WebSocketClient = require('websocket').client
var client = new WebSocketClient()
var conn
var editors = {}

client.on('connectFailed', function(error) {
  console.log('Connect Error:', error.toString())
})

client.on('connect', function(connection) {
  conn = connection
  conn.on('error', function(error) {
    console.log('Connection Error:', error.toString())
  })
  conn.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log("Received: '" + message.utf8Data + "'")
    }
  })
  flush()
})

client.connect('ws://localhost:1337/', 'dione')

function flush() {
  conn.sendUTF(JSON.stringify(editors))
  editors = {}
}

global.trace = function(path, range) {
  var commands = editors[path]
  if (!commands) {
    commands = []
    editors[path] = commands
  }
  commands.push(range)
  if (conn && conn.connected) {
    flush()
  }
}

var jsExtension = require.extensions['.js']
var opts = { locations: true }
var nodeTypes = [
  'ExpressionStatement',
  'BreakStatement',
  'ContinueStatement',
  'VariableDeclaration',
  'ReturnStatement',
  'ThrowStatement',
  'TryStatement',
  'FunctionDeclaration',
  'IfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'SwitchStatement',
  'WithStatement'
]

require.extensions['.js'] = function (obj, path) {
  if (path.indexOf('node_modules') > 0) return jsExtension(obj, path)

  var src = fs.readFileSync(path, 'utf8')
  var js = falafel(src, opts, function (node) {
    var loc = node.loc
    if (node.type === 'IfStatement') {
      loc = node.test.loc
    } else if (node.type === 'FunctionDeclaration') {
      loc = node.id.loc
    }
    if (nodeTypes.indexOf(node.type) >= 0) {
      var range = [[loc.start.line-1, loc.start.column], [loc.end.line-1, loc.end.column]]
      node.update('trace("'+path+'", '+JSON.stringify(range)+');'+node.source());
    }
  }).toString()

  // TODO: stripBOM
  return obj._compile(js, path)
}
