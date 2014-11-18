//================================================================
// rutter-p5.js
//
// Author: Robert Utter
// Course: CSCI-566, Program 5
//
// Inspired by: ColoredPoint.js (c) 2012 matsuda
//================================================================


//================================================================
// SCENE OBJECTS
//
//    the asset objects contain geometry data, vertex buffers, etc.
//    some of this data will be populated during init
//================================================================

//windmill in the center of town
var windmill = {
  turn: true,
  turnSpeed: 30,
  spinSpeed: 20,
};

//player object (moves the camera)
var player = {
  angle: 270,
  turnSpeed: 50,
  walkSpeed: 3,

  pos: new Float32Array([0, 1, 4]),
  center: new Float32Array([0,1,0]),  
};

//stars in the sky
var stars = {
  active: [],
  inactive: [],
  maxStars: data.maxStars,
};

//flat list of scene colliders
var colliders = [];

//placeholders for materials, textures
var roof1 = {};
var roof2 = {};
var wood1 = {};
var ground = {};
var wall = {};
var tex = {};


//================================================================
// TIME OF DAY
//
//    I've built a time-of-day system into the scene. This 
//    populates lighting and skybox color data.
//================================================================

// Data for time-of-day system
//
//   - timeOfDay            0,1 percent through day
//   - lightPos             Diffuse light position
//   - lightColor           Diffuse light color
//   - ambientLightColor    Just what it says on the tin
//   - skyColor             Clear color (sky is background)
//   - numStars             How many stars should be active?
//
// In general, the system picks current/next TOD values, then interpolates.
var time = {
  multiply: 1,
  timeOfDay: Math.random(),
  secondsPerDay: 120,
  skyColor: new Float32Array([0.65, 0.85, 1.0]),
  activeStars: 0,
  states: data.timeStates,
}


//================================================================
// OTHER GLOBAL STATE
//
//    making these global for now
//    OOP might be better, but I'm still learning JS
//================================================================

//canvas and GL context
var canvas;
var gl;
var scene;

//timestamp as of last frame (to calculate change)
var lastFrameTime = null;
var totalTime = null;

//log control flags
var log_keys = true;

//keyboard input
//handled via a hash (keys currently pressed are "true", all others undefined or "false")
var keys = {};
var keys_left = ['%', 'left']; //A or left arrow
var keys_right = ["'", 'right']; //D or right arrow (the spec uses some weird characters, here)
var keys_forward = ['&'];
var keys_back = ['('];
var keys_strafeRight = ['E'];
var keys_strafeLeft = ['Q'];
var keys_windmill_spin = ['Y'];

//these keys are "on press" only -- they're checked in the input handler event, not updates
var keys_windmill_toggle = ['W'];
var keys_time_multiply = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
var keys_color_toggle = ['C'];


//================================================================
// INIT FUNCTIONS
//
//    initialize webgl, schedule event handlers, start render loop
//================================================================

/// @brief Texture load callback. Called by AsyncTextures started in main().
/// 
/// @post If all textures are loaded, start the game.
function checkInit() {
  if (allAsyncTexturesReady()) {
    console.log("Starting game...");
    if (!initGame()) {
      console.warn("initGame failed");
      return;
    }    
    if (!initScene()) {
      console.warn("initScene failed");
      return;
    }

    //call first tick
    tick();
  }
}


/// @brief Main hook, called once page has loaded.
/// 
/// @pre Page has fully loaded.
/// @post Canvas/GL cached, image downloads started (once finished, callback starts game).
function main() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.warn('Failed to get the rendering context for WebGL');
    return false;
  }

  roof1.async = new AsyncTexture(gl, 'roof1.png', checkInit);
  roof2.async = new AsyncTexture(gl, 'roof2.png', checkInit);
  wood1.async = new AsyncTexture(gl, 'wood1.png', checkInit);
  ground.async = new AsyncTexture(gl, 'ground.jpg', checkInit);
  wall.async = new AsyncTexture(gl, 'wall.png', checkInit);
  tex.async = new AsyncTexture(gl, 'tex.png', checkInit);
}


/// @brief Initialize input handlers, gameplay objects.
/// 
/// @pre Page has fully loaded.
/// @post Input handlers registered, icicles array populated.
function initGame() {
  //keyboard handlers: populate a hash of keys currently pressed
  document.onkeyup = function(ev){
    var key = String.fromCharCode(ev.which);
    keys[key] = false;
    if (log_keys) console.log("release " + key);
  };

  document.onkeydown = function(ev) {
    var key = String.fromCharCode(ev.which);
    keys[key] = true;
    if (log_keys) console.log("press " + key);

    //special key handlers
    var timeIndex = keys_time_multiply.indexOf(key);
    if (timeIndex != -1) time.multiply = timeIndex;
    if (keys_windmill_toggle.indexOf(key) != -1) windmill.turn = !windmill.turn;

    //very special: toggle all materials in scene
    if (keys_color_toggle.indexOf(key) != -1) {
      var n = scene.renderers.length;
      var materials = [];

      for (var i=0; i<n; i++) {
        var m = scene.renderers[i].material;

        //make sure each material we process is unique
        if (materials.indexOf(m) != -1) continue;
        else materials.push(m);

        //either get material's last tex unit, or assume the default
        var backupIndex = m.backupIndex;
        var undefined;
        if (backupIndex === undefined) backupIndex = tex.async.ID;

        //do the toggle
        m.backupIndex = m.textureUnit;
        m.setTextureUnit(backupIndex);
      }
    }

  };

  return true;
}


/// @brief Initialize GL shaders and buffers.
/// 
/// @pre Canvas and GL context are cached, all textures are loaded.
/// @post All shaders, materials, renderers, and shapes are ready.
function initScene() {
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  //----

  scene = new Scene(gl, canvas);
  scene.camera.setPerspective(90, canvas.width/canvas.height, 0.5, 1000);  

  //----

  //main shader
  //  - includes ambient, diffuse lighting
  //  - supports two UV spaces for texturing
  //  - assumes full normal transform, for non-uniform scaling
  var shader = new Shader(scene, data.shaderMain.vert, data.shaderMain.frag);
  shader.wantsUV2 = true;

  //shader for the stars in the sky
  //we just want these stars to be white all the time
  var starShader = new Shader(scene, data.shaderStar.vert, data.shaderStar.frag);
  starShader.wantsDiffuseLight = false;
  starShader.wantsAmbientLight = false;
  starShader.wantsNormals = false;
  starShader.wantsUV1 = false;
  starShader.wantsUV2 = false;

  //the cube we will use for all geometry in the scene
  //see notes in data.js to explain the cube data
  var cube = new Shape(scene, 'pos3_norm_uv_uv2', gl.TRIANGLES, data.cubeVerts);  

  //----

  //init materials
  roof1.material = new Material(scene, shader).setTextureUnit(roof1.async.ID);
  roof2.material = new Material(scene, shader).setTextureUnit(roof2.async.ID);
  wood1.material = new Material(scene, shader).setTextureUnit(wood1.async.ID);
  wall.material = new Material(scene, shader).setTextureUnit(wall.async.ID);

  //ground mat is the only one using second UV set
  ground.material = new Material(scene, shader).setTextureUnit(ground.async.ID);
  ground.material.setFloat('u_uvWeight', 1);

  //star mat is the only one using starShader
  var starMat = new Material(scene, starShader);
  starMat.floats = [];

  //----

  //ground
  var groundTrans = new Transform().scale(50, 1, 50).rotate(180, 0, 0);
  new Renderer(scene, ground.material, cube, groundTrans);

  buildWindmill(cube);
  buildHouses(cube);
  buildStars(cube, starMat);

  return true;  
}


/// @brief Helper function for initScene. Builds a windmill at center of town.
///
/// @param cube    Shape object.
///
/// @pre Scene, shaders, materials, shapes are initialized.
/// @post A windmill exists! Including renderers, collider.
function buildWindmill(cube) {
  //windmill base transforms
  windmill.root = new Transform();
  windmill.bladesRoot = new Transform(windmill.root).translate(0, 2.9, 0.2);
  windmill.blades = new Transform(windmill.bladesRoot);
  windmill.blades0 = new Transform(windmill.blades).rotate(0, 0, 90);

  //windmill post
  var postTrans = new Transform(windmill.root).scale(0.2, 3, 0.2);
  new Renderer(scene, wood1.material, cube, postTrans);

  //windmill pedestal
  var pedestalTrans = new Transform().scale(1.05, 0.1, 1.05);
  new Renderer(scene, wood1.material, cube, pedestalTrans);

  //windmill collider
  colliders.push({
    position: new Float32Array([0,0,0]),
    radius: 1.5,
  });

  //create windmill blades
  for (var side=0; side<2; side++) {
    for (var flip=0; flip<2; flip++) {
      var blades = new Transform(flip ? windmill.blades0 : windmill.blades);
      var container = new Transform(blades)
        .translate(0, 0.14, 0)
        .rotate(0, 0, (side ? 180 : 0));

      var bladeTrans = new Transform(container).scale(0.3, 1.3, 0.1);
      new Renderer(scene, wood1.material, cube, bladeTrans);
    }
  }  
}


/// @brief Helper function for initScene. Builds random houses around center of town.
///
/// @param cube    Shape object.
///
/// @pre Scene, shaders, materials, shapes are initialized.
/// @post About 5-6 houses are built in the scene, including renderers, colliders.
function buildHouses(cube) {
  //create houses around the windmill
  var houseRot = Math.random() * 360;
  var minHouseDegrees = 40;
  var maxHouseDegrees = 50;
  var numHouses = Math.floor(360 / maxHouseDegrees);
  for (var i=0; i<numHouses; i++) {

    //calculate position for this house
    var angle = houseRot;
    var cos = Math.cos(angle * (Math.PI / 180));
    var sin = Math.sin(angle * (Math.PI / 180));
    var radius = 8 + (Math.random() * 3);

    var x = cos * radius;
    var y = 0;
    var z = sin * radius;

    //house collider and root transform
    var houseRoot = new Transform().translate(x, y, z);
    colliders.push({
      position: new Float32Array([x, y, z]),
      radius: 2.5,
    });

    //slightly random rotation offset
    var slightRot = (Math.random() * 20) - 10;

    //house body
    var houseBase = new Transform(houseRoot)
      .rotate(0, houseRot - 90 + slightRot, 0)
      .scale(3, 2, 3);
    new Renderer(scene, wall.material, cube, houseBase);

    //house trim (around base)
    var floorTrans = new Transform(houseBase).scale(1.05, 0.05, 1.05);
    new Renderer(scene, roof1.material, cube, floorTrans);

    //randomized house roof
    if (Math.random() <= 0.7) {
      //Roof Type A: single slab
      var roofRoot = new Transform(houseBase).translate(0, 1, 0);
      var roofTrans = new Transform(roofRoot).scale(1.1, 0.2, 1.1);
      new Renderer(scene, roof1.material, cube, roofTrans);

      var chimneyRoot = new Transform(houseBase).translate(-0.3, 0, -0.3);
      var chimneyTrans = new Transform(chimneyRoot).scale(0.2, 1.4, 0.2);
      new Renderer(scene, roof2.material, cube, chimneyTrans);

    } else {
      //Roof Type B: tapered slabs
      var roofSize = 1.1;
      var roofHeight = 1;
      var roofThickness = 0.1;

      for (var ri=0; ri<5; ri++) {
        var roofRoot = new Transform(houseBase).translate(0, roofHeight, 0);
        var roofTrans = new Transform(roofRoot).scale(roofSize, roofThickness, roofSize);
        new Renderer(scene, roof2.material, cube, roofTrans);

        roofHeight += roofThickness;
        roofSize -= 0.2;
      }
    }

    houseRot += minHouseDegrees + (Math.random() * (maxHouseDegrees - minHouseDegrees));
  }  
}


/// @brief Helper function for initScene. Builds random stars in the sky.
///
/// @param cube       Shape object.
/// @param starMat    Material object.
///
/// @pre Scene, shaders, materials, shapes are initialized.
/// @post About 100 stars are thrown up into the sky, all disabled for now.
function buildStars(cube, starMat) {
  for (var i=0; i<stars.maxStars; i++) {
    //calculating random point on a sphere: http://mathworld.wolfram.com/SpherePointPicking.html
    var pointScale = 1;
    var radius = 200 / pointScale;
    var angle = Math.random() * Math.PI * 2;
    var u = 0.3 + Math.random() * 0.7;

    //we depart slightly from the documented method: we want only the top half
    var x = radius * Math.sqrt(1 - u*u) * Math.cos(angle);
    var y = radius * u;
    var z = radius * Math.sqrt(1 - u*u) * Math.sin(angle);

    var starTrans = new Transform().translate(x,y,z).scale(pointScale,pointScale,pointScale);
    var r = new Renderer(scene, starMat, cube, starTrans);
    r.enabled = false;
    stars.inactive.push(r);
  }  
}


//================================================================
// RENDER CALLBACK
//
//    called once per frame
//    clears canvas and renders pretty points
//================================================================

/// @brief Engine loop: update, render, repeat.
/// 
/// @pre Game is initialized.
/// @post Update and render are called, next tick is scheduled.
function tick() {
  //request next frame callback
  window.requestAnimationFrame(tick, canvas);

  update();
  render();
}


/// @brief Update the game. Called once per tick.
/// 
/// @pre Game is initialized.
/// @post All game objects are advanced by one frame.
function update() {
  var deltaTime = calculateDeltaTime();

  updateTimeOfDay(deltaTime);
  updatePlayer(deltaTime);
  updateWindmill(deltaTime);
}


/// @brief Render the scene. Called once per tick.
/// 
/// @pre Game is initialized.
/// @post Player, floor, and all icicles are rendered.
function render() {
  //clear the canvas
  var sky = time.skyColor;
  gl.clearColor(sky[0], sky[1], sky[2], 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  scene.render();
}


/// @brief Calculates time since last frame. Call exactly once per frame.
/// 
/// @post Timer data is updated. Do this no more than once per frame.
/// @return Time since last frame (in seconds).
function calculateDeltaTime() {
  var curFrameTime = new Date().getTime();
  var deltaTime = 0.0;
  if (lastFrameTime) {
    deltaTime = (curFrameTime - lastFrameTime) / 1000.0;
  }
  lastFrameTime = curFrameTime;

  totalTime += deltaTime;

  return deltaTime;
}


//================================================================
// UPDATE FUNCTIONS
//
//    called once per frame, before render
//================================================================

/// @brief Helper function for update. Updates the player.
///
/// @param deltaTime    Number of seconds since last frame.
///
/// @pre All scene init.
/// @post The player moves, including camera.
function updatePlayer(deltaTime) {
  //read input: turning
  var turn = 0;
  if (checkKeys(keys_left)) turn -= 1;
  if (checkKeys(keys_right)) turn += 1;

  //read input: walking, strafing
  var fwd = 0;
  if (checkKeys(keys_forward)) fwd += 1;
  if (checkKeys(keys_back)) fwd -= 1;
  var side = 0;
  if (checkKeys(keys_strafeRight)) side += 1;
  if (checkKeys(keys_strafeLeft)) side -= 1;

  //scale by time and speed
  player.angle += turn * player.turnSpeed * deltaTime;
  var fwdMove = fwd * player.walkSpeed * deltaTime;
  var sideMove = side * player.walkSpeed * deltaTime;

  //calculate change in movement
  //sinA and cosA are for forward motion
  //sinB and cosB are for strafing (rotated 90 degrees)
  var sinA = Math.sin(player.angle * (Math.PI / 180));
  var cosA = Math.cos(player.angle * (Math.PI / 180));
  var sinB = Math.sin((player.angle + 90) * (Math.PI / 180));
  var cosB = Math.cos((player.angle + 90) * (Math.PI / 180));

  //check collision
  //the scene uses 3D sphere colliders
  //if we're about to walk into one of them, cancel the movement
  var targetX = player.pos[0] + fwdMove * cosA + sideMove * cosB;
  var targetZ = player.pos[2] + fwdMove * sinA + sideMove * sinB;
  var movementBlocked = false;
  var numColliders = colliders.length;
  for (var i=0; !movementBlocked && i<numColliders; i++) {
    //distance check with modified pythagorean theorem
    //comparing squared distance saves us expensive sqrt operations
    //we don't particularly care about the magnitude, here, only that one is larger than the other
    var xd = targetX - colliders[i].position[0];
    var zd = targetZ - colliders[i].position[2];
    var sqDist = (xd*xd) + (zd*zd);
    var sqRadius = colliders[i].radius * colliders[i].radius;
    if (sqRadius > sqDist) {
      movementBlocked = true;
    }
  }

  //apply movement
  if (!movementBlocked) {
    player.pos[0] = targetX;
    player.pos[2] = targetZ;
  }
  player.center[0] = player.pos[0] + cosA;
  player.center[2] = player.pos[2] + sinA;

  //send to camera
  scene.camera.setLookAt(
    player.pos[0], player.pos[1], player.pos[2],
    player.center[0], player.center[1], player.center[2],
    0, 1, 0
  );  
}


/// @brief Helper function for update. Updates the windmill.
///
/// @param deltaTime    Number of seconds since last frame.
///
/// @pre All scene init.
/// @post Windmill turns (blades, post).
function updateWindmill(deltaTime) {
  //turn the windmill?
  if (windmill.turn) {
    windmill.blades.rotate(0, 0, windmill.turnSpeed * deltaTime);
  }

  //spin the windmill?
  if (checkKeys(keys_windmill_spin)) {
    windmill.root.rotate(0, -windmill.spinSpeed * deltaTime, 0);
  }
}


/// @brief Helper function for update. Updates the time-of-day system.
///
/// @param deltaTime    Number of seconds since last frame.
///
/// @pre All scene init.
/// @post Time of day advances, including sky color, scene lighting, stars in sky.
function updateTimeOfDay(deltaTime) {
  //increment time of day
  time.timeOfDay += time.multiply * (deltaTime / time.secondsPerDay);
  while (time.timeOfDay >= 1) time.timeOfDay -= 1;

  //identify current + next TOD
  var currTimeIndex = 0;
  for (var i=0; i<time.states.length; i++) {
    if (time.timeOfDay > time.states[i].timeOfDay) currTimeIndex = i;
  }
  var nextTimeIndex = (currTimeIndex + 1) % time.states.length;

  //cache values, calculate interpolation percentage
  var curr = time.states[currTimeIndex];
  var next = time.states[nextTimeIndex];
  var perc = Mathx.inverseLerp(curr.timeOfDay, next.timeOfDay, time.timeOfDay);

  //lerp star count
  var targetActiveStars = Math.floor(Mathx.lerp(curr.numStars, next.numStars, perc));
  while (time.activeStars != targetActiveStars) {
    if (time.activeStars < targetActiveStars) {
      var s = stars.inactive[0];
      stars.inactive.splice(0, 1);
      stars.active.push(s);
      s.enabled = true;
      time.activeStars++;
    } else {
      var s = stars.active[0];
      stars.active.splice(0, 1);
      stars.inactive.push(s);
      s.enabled = false;
      time.activeStars--;
    }
  }
  time.activeStars = targetActiveStars;

  //lerp scene lighting
  Mathx.lerpVec(scene.light.dirLightDir, curr.lightPos, next.lightPos, perc);
  Mathx.lerpVec(scene.light.dirLightColor, curr.lightColor, next.lightColor, perc);
  Mathx.lerpVec(scene.light.ambientLightColor, curr.ambientLightColor, next.ambientLightColor, perc);
  scene.light.dirty = true;

  //lerp the sky color
  Mathx.lerpVec(time.skyColor, curr.skyColor, next.skyColor, perc);
}


//================================================================
// HELPER FUNCTIONS
//================================================================

/// @brief Checks keyboard input.
/// 
/// @param keysToCheck    String array. List of keys to check.
/// 
/// @pre Keys hash is set up. Should probably set key handlers, too.
/// @return True if one or more of the requested keys are pressed, false otherwise.
function checkKeys(keysToCheck) {
  var numKeysToCheck = keysToCheck.length;
  for (var i=0; i<numKeysToCheck; i++) {
    if (keys[keysToCheck[i]]) {
      return true;
    }
  }
  return false;
}
