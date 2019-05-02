var should = require("chai").should();
var Heirarchy = require('./heirarchy');
var asynk = require('async');
var Emitter = require('extended-emitter');

var eventType = 'keydown';

if(!global.Event){
  global.Event = function(type){
    return {type: type};
  }
}

function keyboardEvent(c, options, dispatch){
    var e = new Event(eventType);
    e.key = c;
    e.keyCode = e.key.charCodeAt(0);
    e.which = e.keyCode;
    e.altKey = !!(options && options.alt);
    e.ctrlKey = !!(options && options.ctrl);
    e.shiftKey = !!(options && options.shift);
    e.metaKey = !!(options && options.meta);
    e.bubbles = true;
    if(dispatch) document.dispatchEvent(e);
    return e;
}

var Keyboard = {};
Keyboard.type = function(str, options, cb, pipedStream){
  var stream = pipedStream || Keyboard.defaultStream || (Keyboard.defaultStream = new Emitter());
  var chars = str.split('');
  asynk.eachOfSeries(chars, function(chr, index, done){
    stream.emit(eventType, keyboardEvent(chr, options))
    //setTimeout(function(){
      done();
    //}, 0)
  }, function(){
    cb();
  });
  return stream;
}



describe('stream-responder-heirarchy', function(){

    global.document = {body:{ addEventListener:function(){} }}
    global.window = {};

    it('emitter works', function(complete){
        var emitter = new Emitter();
        emitter.on('test', {
          value : {'$gt' : 3}
        }, function(e){
          complete();
        });
        emitter.emit('test', {
          value : 5
        })
    });

    it('delivers an event to an active node', function(complete){
        var keyboardEmitter = new Emitter();
        var count = 0;

        //ASSEMBLE THE STRUCTURE
        var heirarchy = new Heirarchy({ eventType : 'input' });
        var node = new Heirarchy.Node({ eventType : 'input' });
        node.on('input', function(e){
          count++;
        });
        heirarchy.add(node);
        heirarchy.tap('keydown', keyboardEmitter);

        //FAKE THE KEYSTROKES
        Keyboard.type('blah', {}, function(){
          count.should.equal(4);
          complete();
        }, keyboardEmitter);
        heirarchy.tap('keydown', keyboardEmitter);
    });

    it('delivers a filtered event to an active node', function(complete){
        var keyboardEmitter = new Emitter();
        var count = 0;

        //ASSEMBLE THE STRUCTURE
        var heirarchy = new Heirarchy({ eventType : 'input' });
        var node = new Heirarchy.Node({ eventType : 'input' });
        node.on('input', {key: 'h'}, function(e){
          count++;
        });
        heirarchy.add(node);
        heirarchy.tap('keydown', keyboardEmitter);

        //FAKE THE KEYSTROKES
        Keyboard.type('blah', {}, function(){
          count.should.equal(1);
          complete();
        }, keyboardEmitter);
        heirarchy.tap('keydown', keyboardEmitter);
    });

    it('delivers an event to an active descendent node', function(complete){
        var keyboardEmitter = new Emitter();
        var count = 0;

        //ASSEMBLE THE STRUCTURE
        var heirarchy = new Heirarchy({ eventType : 'input' });
        var parent = new Heirarchy.Node({ eventType : 'input' });
        var node = new Heirarchy.Node({ eventType : 'input' });
        node.on('input', function(e){
          count++;
        });
        heirarchy.add(parent);
        parent.add(node);
        heirarchy.tap('keydown', keyboardEmitter);

        //FAKE THE KEYSTROKES
        Keyboard.type('blah', {}, function(){
          count.should.equal(4);
          complete();
        }, keyboardEmitter);
        heirarchy.tap('keydown', keyboardEmitter);
    });

    it('doesn\'t deliver an event to an inactive descendent node', function(complete){
        var keyboardEmitter = new Emitter();
        var count = 0;

        //ASSEMBLE THE STRUCTURE
        var heirarchy = new Heirarchy({ eventType : 'input' });
        var parent = new Heirarchy.Node({ eventType : 'input' });
        var node = new Heirarchy.Node({ eventType : 'input' });
        node.on('input', function(e){
          count++;
        });
        heirarchy.add(parent);
        parent.add(node);
        parent.deactivate();
        heirarchy.tap('keydown', keyboardEmitter);

        //FAKE THE KEYSTROKES
        Keyboard.type('blah', {}, function(){
          count.should.equal(0);
          complete();
        }, keyboardEmitter);
        heirarchy.tap('keydown', keyboardEmitter);
    });

});
