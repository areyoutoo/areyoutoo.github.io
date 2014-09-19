//================================================================
// rutter-p2.js
//
// Author: Robert Utter
// Course: CSCI-566, Program 2
//
// Inspired by: ColoredPoint.js (c) 2012 matsuda
//================================================================

// CHECKLIST
//
// Your program must:
//
// - [x] render a 2D image of geo prims
//
// - [x] use at least two buffer objects for vert attributes
//     1. player's head
//     2. icicle's shape
//
// - [x] use at least one uniform to vert, one uniform to frag
//     1. gradient vert shader gets uniform u_offset
//     2. flat frag shader gets uniform u_color
//
// - [x] use every type of WebGL primitive
//      1. gl.POINTS: player's eyes
//      2. gl.LINES: player's arms, legs, torso
//      3. gl.TRIANGLES: icicles
//      4. gl.LINE_STRIP: player's smile
//      5. gl.LINE_LOOP: outline on icicles, player's head
//      6. gl.TRIANGLE_STRIP: the ground
//      7. gl.TRIANGLE_FAN: the player's head
//
// - [x] use variety of colors
//
// - [x] have some kind of user interaction
//
// - [x] add your name as author, credit original source
//
// - [x] add any missing documentation


//SHADERS
//----------------------------------------------------------------
//the 'shaders' object holds all shader code, attrib/uniform locations, etc.
//some of this information will be allocated during init

var shaders = {
  gradient: {
    vert: [
      'precision mediump float;',
      '',
      'uniform vec2 u_scale;',
      'uniform vec2 u_offset;',
      'uniform vec4 u_innerColor;',
      'uniform vec4 u_outerColor;',
      'uniform float u_outerRadius;',
      '',
      'attribute vec2 a_pos;',
      '',
      'varying vec4 v_color;',
      '',
      'void main() {',
      '  vec2 pos = a_pos * u_scale + u_offset * u_scale;',
      '  gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);', //not quite a model-view-projection, but it'll do for now
      '',
      '  float dist = length(a_pos);',
      '  float distPerc = clamp(dist / u_outerRadius, 0.0, 1.0);',
      '  v_color = mix(u_innerColor, u_outerColor, distPerc);', //color gradient toward outside of shape
      '}',
    ].join('\n'),
    frag: [
      'precision mediump float;',
      '',
      'varying vec4 v_color;',
      '',
      'void main() {',
      '  gl_FragColor = v_color;',
      '}',
    ].join('\n'),
  },

  flat: {
    vert: [
      'precision mediump float;',
      '',
      'uniform vec2 u_scale;',
      'uniform vec2 u_offset;',
      '',
      'attribute vec2 a_pos;',
      '',
      'void main() {',
      '  vec2 pos = a_pos * u_scale + u_offset * u_scale;',
      '  gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);', //not quite a model-view-projection, but it'll do for now
      '  gl_PointSize = 2.0;',
      '}',
    ].join('\n'),
    frag: [
      'precision mediump float;',
      '',
      'uniform vec4 u_color;',
      '',
      'void main() {',
      '  gl_FragColor = u_color;',
      '}',
    ].join('\n'),
  }
};


//ASSETS
//----------------------------------------------------------------
//the asset objects contain geometry data, vertex buffers, etc.
//again, some of this data will be populated during init

var player = {
  head: {
    verts: new Float32Array([ //head drawn using TRI_FAN and LINE_LOOP
      0.0, 0.0,
      -0.4, 0.5,
      0.4, 0.5,
      0.5, 0.0,
      0.4, -0.5,
      -0.4, -0.5,
      -0.5, 0.0,
      -0.4, 0.5, 
    ]),
    radius: 1.0,
    innerColor: new Float32Array([1.0, 1.0, 1.0, 1.0]),
    outerColor: new Float32Array([0.2, 0.2, 0.2, 1.0]),
    offset: new Float32Array([0.0, 0.0]),
    baseOffset: new Float32Array([0.0, 0.0]),
    scale: new Float32Array([0.1, 0.1]),
  },

  torso: {
    verts: new Float32Array([ //torso drawn using LINES
      0.0, 0.0,     0.0, -0.4,
      -0.2, -0.2,   0.2, -0.2,
      -0.2, -0.5,   0.0, -0.4,
      0.2, -0.5,    0.0, -0.4,
    ]),
    offset: new Float32Array([0.0, 0.0]),
    baseOffset: new Float32Array([0.0, -0.5]),
    scale: new Float32Array([0.1, 0.1]),    
  },

  smile: {
    verts: new Float32Array([ //smile draw using LINE_STRIP
      -0.3, 0.1,
      -0.2, 0.0,
      0.2, 0.0,
      0.3, 0.1,
    ]),
    offset: new Float32Array([0.0, 0.0]),
    baseOffset: new Float32Array([0.0, -0.2]),
    scale: new Float32Array([0.1, 0.1]),    
  },

  eyes: {
    verts: new Float32Array([ //eyes drawn using POINTS
      -0.25, 0.0,
      0.25, 0.0,
    ]),
    offset: new Float32Array([0.0, 0.0]),
    baseOffset: new Float32Array([0.0, 0.1]),
    scale: new Float32Array([0.1, 0.1]),
  },

  xPos: 0.0,
  yPos: -8.0,

  alive: true,
};

var icicle = {
  verts: new Float32Array([ //icicles drawn using TRIANGLES and LINE_LOOP
    0.0, 0.0,
    -0.5, 1.0,
    0.5, 1.0,
  ]),
  radius: 1.3,
  innerColor: new Float32Array([0.0, 0.0, 1.0, 1.0]),
  outerColor: new Float32Array([0.6, 0.6, 0.9, 1.0]),
  scale: new Float32Array([0.1, 0.1]),

  width: 1.0,
  gap: 0.3,
}

var floor = {
  verts: new Float32Array([ //floor drawn using TRI_STRIP
    -10.0, 0.0,
    -10.0, -1.0,
    0.0, 0.0,
    0.0, -1.0,
    10.0, 0.0,
    10.0, -1.0,
  ]),
  innerColor: new Float32Array([0.54, 0.27, 0.07, 1.0]),
  outerColor: new Float32Array([0.80, 0.52, 0.24, 1.0]),
  scale: new Float32Array([0.1, 0.1]),
  offset: new Float32Array([0.0, -9.0]),
  radius: 11.0,
}


//OTHER GLOBAL STATE
//----------------------------------------------------------------
//making these global for now
//OOP might be better, but I'm still learning JS

//canvas and GL context
var canvas;
var gl;

//timestamp as of last frame (to calculate change)
var lastFrameTime = null;

//log control flags
var log_shader = true;
var log_keys = true;
var log_input = false;

//keyboard input
//handled via a hash (keys currently pressed are "true", all others undefined or "false")
var keys = {};
var keys_left = ['A', '%', 'left']; //A or left arrow
var keys_right = ['D', "'", 'right']; //D or right arrow (the spec uses some weird characters, here)

//gameplay constants
//screen boundaries, move speed, etc.
var maxX = 9.0;
var maxY = 10.0;
var playerMoveSpeed = 5.0;
var gravity = 0.5;

//set of icicles currently in play (populated during init)
var icicles = [];


//INIT FUNCTIONS
//----
//initialize webgl, schedule event handlers, start render loop


function main() {
  if (!initGL()) {
    console.log("initGL failed");
    return;
  }

  if (!initGame()) {
    console.log("initGame failed");
    return;
  }

  //start the render loop
  render();
}


function initGL() {
  //find canvas element, get WebGL render context
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }

  //compile shaders, link uniforms/attribs
  var success = initProgram(
    shaders.gradient,
    'gradient', 
    [
      'u_scale',
      'u_offset',
      'u_innerColor',
      'u_outerColor',
      'u_outerRadius'
    ],
    [
      'a_pos'
    ]
  ) && initProgram(
    shaders.flat,
    'flat',
    [
      'u_scale',
      'u_offset',
      'u_color'
    ],
    [
      'a_pos'
    ]
  );

  if (!success) {
    console.log('Aborting initGL due to shader error');
    return false;
  }  

  //populate buffers
  player.head.vertBuffer = initBuffer(player.head.verts);
  player.torso.vertBuffer = initBuffer(player.torso.verts);
  player.smile.vertBuffer = initBuffer(player.smile.verts);
  player.eyes.vertBuffer = initBuffer(player.eyes.verts);
  icicle.vertBuffer = initBuffer(icicle.verts);
  floor.vertBuffer = initBuffer(floor.verts);

  return true;
}


function initProgram(obj, progName, uniformNames, attribNames) {
  //compile shaders
  obj.program = createProgram(gl, obj.vert, obj.frag);
  if (!obj.program) {
    console.log("Failed to create program for '" + progName + "'");
    return false;
  }

  //get uniforms, if any
  if (uniformNames) {
    var links = {};
    for (var i=0; i<uniformNames.length; i++) {
      var name = uniformNames[i];
      var link = gl.getUniformLocation(obj.program, name);
      if (!link) {
        console.log("Failed to get uniform location for '" + name + "' in '" + progName + "'");
        return false;
      } else if (log_shader) {
        console.log("Uniform location for '" + name + "' in '" + progName + "' is " + link);
      }
      links[name] = link;
    }
    obj.uniforms = links;
  }

  //get attribs, if any
  if (attribNames) {
    var links = {};
    for (var i=0; i<attribNames.length; i++) {
      var name = attribNames[i];
      var link = gl.getAttribLocation(obj.program, name);
      if (link < 0) {
        console.log("Failed to get attrib location for '" + name + "' in '" + progName + "'");
        return false;
      } else if (log_shader) {
        console.log("Attrib location for '" + name + "' in '" + progName + "' is " + link);
      }
      links[name] = link;
    }
    obj.attribs = links;
  }

  return true;
}


function initBuffer(verts) {
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create buffer');
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  return buffer;
}


function initGame() {
  //keyboard handlers: populate a hash of keys currently pressed
  document.onkeyup = function(ev){
    var key = String.fromCharCode(ev.which);
    keys[key] = false;
    if (log_keys) { console.log("release " + key); }
  };
  document.onkeydown = function(ev) {
    var key = String.fromCharCode(ev.which);
    keys[key] = true;
    if (log_keys) { console.log("press " + key); }
  };

  //register HTML buttons (useful for mobile)
  initButton("button-left", "left");
  initButton("button-right", "right");

  for (var x = -maxX; x < maxX; x += icicle.width + icicle.gap) {
    var ice = {
      offset: new Float32Array([x, maxY - 1.0]),
      speed: 0.0,
      timeToFall: Math.random() * 2.0 + 1.0,
    };
    icicles.push(ice);
  }

  return true;
}


//finds an HTML element by ID, registers it with the 'keys' hash
//useful for mobile input!
function initButton(buttonId, keyName) {
  var element = document.getElementById(buttonId);
  if (element) {
    element.onmouseup = function(ev) {
      keys[keyName] = false;
      if (log_keys) { console.log("release " + keyName); }
    };
    element.onmousedown = function(ev) {
      keys[keyName] = true;
      if (log_keys) { console.log("press " + keyName); }
    };

    console.log("Registered " + buttonId);

    return true;
  } else {
    console.log("Failed to register " + buttonId);
    return false;
  }

  for (var a in document.getElementsByClassName(className)) {

  }
}


//RENDER CALLBACK
//----------------------------------------------------------------
//called once per frame
//clears canvas and renders pretty points


function render() {
  //request next frame callback
  window.requestAnimationFrame(render, canvas);

  //time since last frame
  var curFrameTime = new Date().getTime();
  var deltaTime = 0.0;
  if (lastFrameTime) {
    deltaTime = (curFrameTime - lastFrameTime) / 1000.0;
  }
  lastFrameTime = curFrameTime;

  //update game state
  update(deltaTime);

  //clear the canvas
  gl.clearColor(0.5, 0.5, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  //render!
  renderPlayer();
  renderIcicles();
  renderFloor();
}


function renderIcicles() {
  var numIcicles = icicles.length;
  var numVerts = icicle.verts.length / 2;

  //----
  //render each icicle
  gl.useProgram(shaders.gradient.program);

  gl.enableVertexAttribArray(shaders.gradient.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, icicle.vertBuffer);
  gl.vertexAttribPointer(shaders.gradient.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);    

  gl.uniform2fv(shaders.gradient.uniforms['u_scale'], icicle.scale);
  gl.uniform4fv(shaders.gradient.uniforms['u_innerColor'], icicle.innerColor);
  gl.uniform4fv(shaders.gradient.uniforms['u_outerColor'], icicle.outerColor);
  gl.uniform1f(shaders.gradient.uniforms['u_outerRadius'], icicle.radius);

  for (var i=0; i<numIcicles; i++) {
    gl.uniform2fv(shaders.gradient.uniforms['u_offset'], icicles[i].offset);
    gl.drawArrays(gl.TRIANGLES, 0, numVerts);  
  }

  //----
  //outline around each icicle
  gl.useProgram(shaders.flat.program);

  gl.enableVertexAttribArray(shaders.flat.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, icicle.vertBuffer);
  gl.vertexAttribPointer(shaders.flat.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);

  gl.uniform4f(shaders.flat.uniforms['u_color'], 0.0, 0.0, 1.0, 1.0);
  gl.uniform2fv(shaders.flat.uniforms['u_scale'], icicle.scale);
  gl.uniform4fv(shaders.flat.uniforms['u_color'], icicle.innerColor);

  for (var i=0; i<numIcicles; i++) {
    gl.uniform2fv(shaders.flat.uniforms['u_offset'], icicles[i].offset);
    gl.drawArrays(gl.LINE_LOOP, 0, numVerts);      
  }

}


function renderPlayer() {
  var numVerts = player.head.verts.length / 2;

  //----
  //render player's head
  gl.useProgram(shaders.gradient.program);

  gl.enableVertexAttribArray(shaders.gradient.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, player.head.vertBuffer);
  gl.vertexAttribPointer(shaders.gradient.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);

  gl.uniform2fv(shaders.gradient.uniforms['u_scale'], player.head.scale);
  gl.uniform2fv(shaders.gradient.uniforms['u_offset'], player.head.offset);
  gl.uniform4fv(shaders.gradient.uniforms['u_innerColor'], player.head.innerColor);
  gl.uniform4fv(shaders.gradient.uniforms['u_outerColor'], player.head.outerColor);
  gl.uniform1f(shaders.gradient.uniforms['u_outerRadius'], player.head.radius);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, numVerts);

  //----
  //outline around the head
  gl.useProgram(shaders.flat.program);
  gl.lineWidth(1.0);

  var red = player.alive ? 0.0 : 1.0;
  gl.uniform4f(shaders.flat.uniforms['u_color'], red, 0.0, 0.0, 1.0);
  
  gl.uniform2fv(shaders.flat.uniforms['u_scale'], player.head.scale);
  gl.uniform2fv(shaders.flat.uniforms['u_offset'], player.head.offset);

  gl.drawArrays(gl.LINE_LOOP, 1, numVerts-1);

  //----
  //draw the body
  gl.enableVertexAttribArray(shaders.flat.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, player.torso.vertBuffer);
  gl.vertexAttribPointer(shaders.flat.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);

  gl.uniform2fv(shaders.flat.uniforms['u_scale'], player.torso.scale);
  gl.uniform2fv(shaders.flat.uniforms['u_offset'], player.torso.offset);

  gl.drawArrays(gl.LINES, 0, player.torso.verts.length / 2);

  //----
  //draw the eyes
  gl.enableVertexAttribArray(shaders.flat.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, player.eyes.vertBuffer);
  gl.vertexAttribPointer(shaders.flat.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);

  gl.uniform2fv(shaders.flat.uniforms['u_scale'], player.eyes.scale);
  gl.uniform2fv(shaders.flat.uniforms['u_offset'], player.eyes.offset);

  gl.drawArrays(gl.POINTS, 0, player.eyes.verts.length / 2);  

  //----
  //draw the smile
  gl.enableVertexAttribArray(shaders.flat.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, player.smile.vertBuffer);
  gl.vertexAttribPointer(shaders.flat.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);

  gl.uniform2fv(shaders.flat.uniforms['u_scale'], player.smile.scale);
  gl.uniform2fv(shaders.flat.uniforms['u_offset'], player.smile.offset);

  gl.drawArrays(gl.LINE_STRIP, 0, player.smile.verts.length / 2);  
}

function renderFloor() {
  var numVerts = floor.verts.length / 2;

  //----
  //render floor
  gl.useProgram(shaders.gradient.program);

  gl.enableVertexAttribArray(shaders.gradient.attribs['a_pos']);
  gl.bindBuffer(gl.ARRAY_BUFFER, floor.vertBuffer);
  gl.vertexAttribPointer(shaders.gradient.attribs['a_pos'], 2, gl.FLOAT, false, 0, 0);

  gl.uniform2fv(shaders.gradient.uniforms['u_scale'], floor.scale);
  gl.uniform2fv(shaders.gradient.uniforms['u_offset'], floor.offset);
  gl.uniform4fv(shaders.gradient.uniforms['u_innerColor'], floor.innerColor);
  gl.uniform4fv(shaders.gradient.uniforms['u_outerColor'], floor.outerColor);
  gl.uniform1f(shaders.gradient.uniforms['u_outerRadius'], floor.radius);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, numVerts);  
}


//UPDATE FUNCTIONS
//----------------------------------------------------------------
//called once per frame, before render


function update(deltaTime) {
  if (player.alive) {
    updatePlayer(deltaTime);
  }
  updateIcicles(deltaTime);
}


function updatePlayer(deltaTime) {
  //check last known keyboard state
  var move = 0.0;
  var buttonLeft = checkKeys(keys_left);
  var buttonRight = checkKeys(keys_right);  
  if (buttonLeft) {
    if (log_input) { console.log("key_left!"); }
    move -= playerMoveSpeed;
  }
  if (buttonRight) {
    if (log_input) { console.log("key_right!"); }
    move += playerMoveSpeed;
  }

  //move player, update vert offsets
  player.xPos = clamp(player.xPos + move * deltaTime, -maxX, maxX);

  player.head.offset[0] = player.head.baseOffset[0] + player.xPos;
  player.head.offset[1] = player.head.baseOffset[1] + player.yPos;

  player.torso.offset[0] = player.torso.baseOffset[0] + player.xPos;
  player.torso.offset[1] = player.torso.baseOffset[1] + player.yPos;

  player.eyes.offset[0] = player.eyes.baseOffset[0] + player.xPos;
  player.eyes.offset[1] = player.eyes.baseOffset[1] + player.yPos;

  player.smile.offset[0] = player.smile.baseOffset[0] + player.xPos;
  player.smile.offset[1] = player.smile.baseOffset[1] + player.yPos;
}


function updateIcicles(deltaTime) {
  var numIcicles = icicles.length;
  for (var i=0; i<numIcicles; i++) {
    updateIcicle(icicles[i], deltaTime);
  }
}


function updateIcicle(ice, deltaTime) {
  //wait until we're supposed to fall...
  ice.timeToFall -= deltaTime;
  if (ice.timeToFall >= 0.0) return;

  //update speed and position
  ice.speed += gravity * deltaTime;
  ice.offset[1] -= ice.speed;

  //reset after we're out of the world
  if (ice.offset[1] < -(maxY+2.0)) {
    ice.timeToFall = Math.random() * 2.0 + 0.5;
    ice.offset[1] = maxY - 1.0;
    ice.speed = 0.0;
  }

  //check collision against player
  if (ice.offset[1] <= player.head.offset[1] + 0.4 && ice.offset[1] >= player.head.offset[1] - 0.6) {
    var halfWidth = icicle.width;
    if (ice.offset[0] >= player.head.offset[0] - halfWidth && ice.offset[0] <= player.head.offset[0] + halfWidth) {
      console.log("DEAD");
      player.alive = false;
    }
  }  
}


function checkKeys(keysToCheck) {
  var numKeysToCheck = keysToCheck.length;
  for (var i=0; i<numKeysToCheck; i++) {
    if (keys[keysToCheck[i]]) {
      return true;
    }
  }
  return false;
}


//MATH HELPERS
//----------------------------------------------------------------

function clamp(val, min, max) {
  return Math.max(Math.min(val, max), min);
}
