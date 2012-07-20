var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var fs = require('fs');

var nicknames = [];

app.listen(8000);

//server loads the client.html page
function handler(req, res){
  var file = req.url;
  if(file == '/'){
    file = '/client.html';
  }
  fs.readFile( __dirname + file,
    function (err, data) {
      if (err) {
        console.log(err);
        res.writeHead(500);
        return res.end('Error loading file: ' + file);
      }
      res.writeHead(200, {'Content-Type' : 'text/html; charset=UTF-8'});
      res.end(data);
  });
};

//Create a websocket for push notifications
io.sockets.on('connection', function (socket){
  //watch the xml file
  fs.watch('example.xml', function (cur, prev) {
    //on file change, we read the new xml
    fs.readFile('example.xml', function (err, data){
      console.log('file changed! -- err:' + err);
      if(err) throw err;
      //parse the xml data and convert to json
      console.log('parser? wtf!');
      /*parser.parseString(data, function(err, result){
        console.log('done parsing, sending update');
        result.time = new Date();
        socket.volatile.emit('notification', result);
      });*/
      parser.parseString(data);
    });
  });
  //When the parsing ends, send the data
  //Don't need this since we used the callback method
  parser.addListener('end', function(result){
    result.time = new Date();
    socket.volatile.emit('notification', result);
  });

  function sendNicknames(){
    socket.broadcast.emit('nicknames', {nicknames: nicknames});
    socket.emit('nicknames', {nicknames: nicknames});
  }
  sendNicknames();

//Chat stuff
  socket.on('nickname update', function(data){
    console.log('got a nickname update: ' + data.nickname);
    socket.nickname = data.nickname;
    console.log('Nickname is: ' + socket.nickname);
    socket.emit('msg posted', {nickname: 'Users', msg: nicknames.join(', ')});
    socket.emit('nickname confirm', {'nickname': socket.nickname});
    nicknames.push(socket.nickname);
    console.log("Nicknames: " + nicknames);
    sendNicknames();
    socket.broadcast.emit('msg posted', {nickname: "+" + socket.nickname + "+", 
                            msg: socket.nickname + " has joined."});
    socket.emit('msg posted', {nickname: "+" + socket.nickname + "+", 
                            msg: socket.nickname + " has joined."});
  });
  socket.on('msg post', function(data){
    socket.emit('msg posted', {nickname: socket.nickname, 
                               msg: data.msg});
    socket.broadcast.emit('msg posted', {nickname: socket.nickname, 
                               msg: data.msg});
  });
  socket.on('disconnect', function (){
    socket.broadcast.emit('msg posted', {nickname: "*" + socket.nickname + "*", msg: '--DISCONNECTED--' });
    var nickIndex = nicknames.indexOf(socket.nickname);
    if(nickIndex != -1){
      //Take out just the one item
      nicknames = nicknames.slice(0, nickIndex).concat(nicknames.slice(nickIndex + 1));
    }
    console.log("Nicknames: " + nicknames);
    sendNicknames();
  });
});

