var ExtendedEmitter = require('extended-emitter');
var asynk = require('async');
var asciitree = require('ascii-tree');

var files = {};

function cachedRequests(url, request, cb){
    if(files[url]){
        setTimeout(function(){
            cb(undefined, files[url])
        }, 0)
    }else{
        request(url, function(err, res, body){
            if(err) return cb(err);
            try{
                var json = body.toString().split("\n");
                files[url] = json;
                cb(undefined, json);
            }catch(ex){
                return cb(ex);
            }
        })
    }

}

var pointToCharLine = function(pos, length){
    var res = '';
    for(var lcv = 1; lcv <= length; lcv++){
        if(pos === lcv) res += '^';
        else res += ' ';
    }
    return res;
};

var bustTrace = function(trace, request, fn, name){
    var cb = fn || function(a){ console.log(a) };
    var res = [];
    var lines = trace.split("\n");
    var id = name || Math.floor(Math.random()*1000000)+'';
    asynk.eachOfSeries(lines, function(line, index, done){
        var parts = line.split('(');
        if(!parts[1]){
            res.push('   '+line);
            return done();
        }
        parts = parts[1].split(')');
        parts.pop();
        var charLocation = parts[0];
        var locationParts = charLocation.split(':')
        var url = locationParts.shift()+':'+locationParts.shift()+':'+locationParts.shift();
        var row = parseInt(locationParts.shift())-1; //from 1, not 0
        var col = parseInt(locationParts.shift());
        cachedRequests(url, request, function(err, codeLines){
            res.push('   '+line)
            res.push('   '+codeLines[row])
            res.push('   '+pointToCharLine(col, codeLines[row]?codeLines[row].length:80));
            res.push("\n")
            done();
        })
    }, function(){
        cb(undefined, 'Stack id '+id+' resolved.'+"\n"+res.join("\n   "))
    });
    return 'Stack Trace resolving ['+id+']';
}

var diffTrace = function(trace, oldTrace){
    var lines = trace.split("\n");
    var oldLines = oldTrace.split("\n");
    var result = {
        common : [],
        oldDiff : [],
        diff : []
    }
    var line;
    var old;
    while(lines.length){
        line = lines.shift();
        old = oldLines.shift();
        if(line === old){
            result.common.push(line);
        }else{
            result.diff.push(line);
            result.oldDiff.push(old);
        }
    }
    result.common = result.common.join("\n")
    result.diff = result.diff.join("\n")
    result.oldDiff = result.oldDiff.join("\n");
    return result;
}

var Heirarchy = function(options){
  this.options = options || {};
  if(this.options.eventType) this.options.eventType = 'input';
  this.children = [];
  this.id = 'H'+Math.floor(Math.random()*100000)+'';
}
Heirarchy.prototype.tap = function(eventType, stream){
  var ob = this;
  //console.log('T', eventType);
  stream.on(eventType, function(e){
    var event;
    //console.log('E', JSON.stringify(e));
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
Heirarchy.prototype.tree = function(highlighted){
  var parts = Heirarchy.Node.prototype.treeComponents.apply(this, [highlighted]);
  var treeConfig = parts.join("\r\n");
  return asciitree.generate(treeConfig);
}
Heirarchy.prototype.add = function(node){
  node.parent = this;
  console.log('root parent', !!node.parent)
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
  this.id = Math.floor(Math.random()*100000)+'';
  this.children = [];
  this.active = true;
  var ob = this;
  this.emitter.on(options.eventType, function(e){
    var event;
     //console.log('>>>', JSON.stringify(e), ob.active);
    if(!ob.active) return;
    ob.children.forEach(function(child){
      event = JSON.parse(JSON.stringify(e));
     //console.log('>>', JSON.stringify(e));
      child.emitter.emit(options.eventType, event);
    })
  });
  this.emitter.onto(this);
}
Heirarchy.Node.prototype.add = function(node){
  if(this.children.indexOf(node) !== -1) throw new Error('adding duplicate node!');
  node.parent = this;
  this.children.push(node);
  console.log('deep parent', !!node.parent)
}
Heirarchy.Node.prototype.remove = function(node){
  var index;
  if(index = this.children.indexOf(node)){
      this.children[index].parent = undefined;
      this.children.splice(index, 1);
  }
}
Heirarchy.Node.prototype.tree = function(node){
  return this.parent.tree(node || this);
}
Heirarchy.Node.prototype.treeComponents = function(highlighted){
  var parts = [];
  if(highlighted === this){
      parts.push('#+Node['+this.id+']'+(this.customId?this.customId():''))
  }else{
      parts.push('#Node['+this.id+']'+(this.customId?this.customId():''))
  }
  this.children.forEach(function(node){
      node.treeComponents(highlighted).forEach(function(component){
          parts.push('#'+component);
      });
  });
  return parts;
}

var request = require('request')
var oldTrace = '';
Heirarchy.Node.prototype.activate = function(){
    //var lines =
  if(this.active){
      var trace = (new Error()).stack;
      var diff = diffTrace(trace, oldTrace)
      console.log(
          'DUPLICATE ACTIVATE ACTION!'+"\n",
          this.tree(),
          //bustTrace((new Error()).stack, request, function(e, a){console.log(a)})
          diff.diff
      )
      oldTrace = trace;
  }
  this.active = true;
  //bustTrace((new Error()).stack, request, function(e, a){console.log(a)})
}
Heirarchy.Node.prototype.deactivate = function(){
    if(!this.active){
        console.log(
            'DUPLICATE DEACTIVATE ACTION!'+"\n",
            this.tree(),
            bustTrace((new Error()).stack, request, function(e, a){console.log(a)})
        )
    }
  this.active = false;
}

module.exports = Heirarchy;
