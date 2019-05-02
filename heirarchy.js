var ExtendedEmitter = require('extended-emitter');

var Heirarchy = function(options){
  this.options = options || {};
  if(this.options.eventType) this.options.eventType = 'input';
  this.children = [];
}
Heirarchy.prototype.tap = function(eventType, stream){
  var ob = this;
  stream.on(eventType, function(e){
    var event;
    ob.emit(ob.options.eventType, e);
  });
}
Heirarchy.prototype.emit = function(type, e){
  this.children.forEach(function(child){
    event = JSON.parse(JSON.stringify(e));
    child.emit(type, event);
  })
}
Heirarchy.prototype.node = function(){
  return new Heirarchy.Node(this.options);
}
Heirarchy.prototype.add = function(node){
  this.children.push(node);
}
Heirarchy.prototype.remove = function(node){
  var index;
  if(index = this.children.indexOf(node)){
    this.children.splice(index, 1);
  }
}

Heirarchy.Node = function(options){
  this.options = options || {};
  this.emitter = new ExtendedEmitter();
  this.children = [];
  this.active = true;
  var ob = this;
  this.emitter.on(options.eventType, function(e){
    var event;
    if(!ob.active) return;
    ob.children.forEach(function(child){
      event = JSON.parse(JSON.stringify(e));
      child.emitter.emit(options.eventType, event);
    })
  });
  this.emitter.onto(this);
}
Heirarchy.Node.prototype.add = function(node){
  this.children.push(node);
}
Heirarchy.Node.prototype.remove = function(node){
  var index;
  if(index = this.children.indexOf(node)){
    this.children.splice(index, 1);
  }
}
Heirarchy.Node.prototype.activate = function(){
  this.active = true;
}
Heirarchy.Node.prototype.deactivate = function(){
  this.active = false;
}

module.exports = Heirarchy;
