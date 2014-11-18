/// ============================================================================
/// @class AsyncTexture
/// 
/// @brief Contains one texture download.
/// ============================================================================

var nextAsyncTextureID = 0;
var asyncTextures = [];

/// @brief Checks if all AsyncTexture loads are finished, yet.
///
/// @return True if all async loads have finished, false otherwise.
function allAsyncTexturesReady() {
  for (var i=0; i<asyncTextures.length; i++) {
    if (!asyncTextures[i].ready) return false;
  }
  return true;
}

/// @brief Starts an async texture load.
/// 
/// @param gl          WebGLContext.
/// @param src         URL path to an image. Can be relative to current location.
/// @param callback    Function to call once the image is loaded.
/// 
/// Your callback function can check if individual loads are finished, or use allAsyncTexturesReady(). 
/// 
/// @return AsyncTexture object. You can query its "ready" and "ID" properties.
function AsyncTexture(gl, src, callback) {
  if (!(gl instanceof Object)) console.error("Invalid arg: gl");
  if (typeof src !== 'string') console.error("Invalid arg: src");
  if (callback && typeof callback !== 'function') console.error("Invalid arg: callback");

  this.ID = nextAsyncTextureID++;
  this.gl = gl;
  this.ready = false;

  asyncTextures.push(this);

  var self = this; //the "this" value won't exist inside the anon func closure, so cache it
  var image = new Image();
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    texture = gl.createTexture();
    if (!texture) {
      console.error("Failed to create texture!");
    }

    gl.activeTexture(gl.TEXTURE0 + self.ID);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    self.ready = true;

    if (callback) callback();
  };

  //setting "src" starts an async load
  image.src = src;
}


/// ============================================================================
/// @class Scene
/// 
/// @brief Contains WebGL context, canvas, camera, light, renderer list.
/// 
/// Basically the root object of everything.
/// ============================================================================

/// @brief Constructor for the Scene class.
/// 
/// @param gl        WebGLcontext
/// @param canvas    Canvas DOM element.
function Scene(gl, canvas) {
  if (!(gl instanceof Object)) console.error("Invalid arg: gl");
  if (!(canvas instanceof Object)) console.error("Invalid arg: context");

  this.gl = gl;
  this.canvas = canvas;

  this.lastUsedShaderID = -1;
  this.nextShaderID = 0;

  this.lastUsedMaterialID = -1;
  this.nextMaterialID = 0;

  this.lastUsedShapeID = -1;
  this.nextShapeID = 0;

  this.renderers = [];
  this.camera = new Camera(this);

  this.ambientLightColor = new Float32Array([1.0, 1.0, 1.0]);
  this.light = new Light(this);
}

/// @brief Adds one renderer to the scene.
/// 
/// @param renderer   The renderer to add.
/// 
/// This is called automatically by Renderer().
Scene.prototype.addRenderer = function(renderer) {
  if (this.renderers.indexOf(renderer) == -1) {
    this.renderers.push(renderer);
  }
}


/// @brief Removes one renderer from the scene.
/// 
/// @param renderer    The renderer to remove.
Scene.prototype.removeRenderer = function(renderer) {
  var index = this.renderers.indexOf(renderer);
  if (index != -1) {
    this.renderers.splice(i, 1);
  }
}

/// @brief Draws all renderers using the scene's camera.
/// 
/// @pre At this time, you are responsible for clearing the canvas.
/// @post All renderers are drawn, in the order show in this.renderers.
Scene.prototype.render = function() {
  this.camera.drawAll(this.renderers);
}


/// ============================================================================
/// @class Shader
/// 
/// @brief Contains one WebGL shader program, plus references to its uniform/attrib values.
/// ============================================================================

var FSIZE = new Float32Array().BYTES_PER_ELEMENT;

/// @brief Constructor for the Shader class.
/// 
/// @param scene      Scene to own this shader.
/// @param vertSrc    String source for the vertex shader.
/// @param fragSrc    String source for the fragment shader.
/// 
/// @return Shader object, containing one compiled program.
function Shader(scene, vertSrc, fragSrc) {
  if (!(scene instanceof Scene)) console.error("Invalid arg: scene");
  if (typeof vertSrc !== 'string') console.error("Invalid arg: vertSrc");
  if (typeof fragSrc !== 'string') console.error("Invalid arg: fragSrc");

  this.ID = scene.nextShaderID++;
  this.gl = scene.gl;
  this.scene = scene;

  this.uniforms = {};
  this.attribs = {};

  this.wantsDiffuseLight = true;
  this.wantsAmbientLight = true;
  this.wantsNormals = true;
  this.wantsUV1 = true;
  this.wantsUV2 = false;

  this.program = createProgram(gl, vertSrc, fragSrc);
  if (!this.program) {
    console.error("createProgram failed!");
  }
}

/// @brief Cached lookup for one uniform variable location.
/// 
/// @param name    String name of the variable location to look up.
/// 
/// @return Location of variable, according to gl.getUniformLocation().
Shader.prototype.getUniform = function(name) {
  var gl = this.gl;

  if (name in this.uniforms) {
    return this.uniforms[name];
  } else {
    var location = gl.getUniformLocation(this.program, name);
    if (!location) {
      console.warn("Failed to get location for " + name);
    } else {
      this.uniforms[name] = location;
    }
    return location;
  }
}

/// @brief Cached lookup for one attribute variable location.
/// 
/// @param name    String name of the variable location to look up.
/// 
/// @return Location of variable, according to gl.getAttribLocation().
Shader.prototype.getAttrib = function(name) {
  var gl = this.gl;

  if (name in this.attribs) {
    return this.attribs[name];
  } else {
    var location = gl.getAttribLocation(this.program, name);
    if (location < 0) {
      console.warn("Failed to get location for " + name);
    } else {
      this.attribs[name] = location;
    }
    return location;
  }  
}

/// @brief Call before each shape draws.
/// 
/// @return True if material/shape values need to be passed in again (for example, switched shaders).
Shader.prototype.preDraw = function() {
  var gl = this.gl;

  if (this.scene.lastUsedShaderID != this.ID) {
    gl.useProgram(this.program);
    this.scene.lastUsedShaderID = this.ID;
    return true;
  } else {
    return false;
  }
}

/// @brief Wrapped call to uniform4fv.
/// 
/// @param name    String name of the variable to set.
/// @param data    Float32Array data to assign.
Shader.prototype.setUniform4f = function(name, data) {
  if (data.length < 4) console.warn("Invalid length for setUniform4f " + name);
  this.gl.uniform4fv(this.getUniform(name), data);
}

/// @brief Wrapped call to uniform3fv.
/// 
/// @param name    String name of the variable to set.
/// @param data    Float32Array data to assign.
Shader.prototype.setUniform3f = function(name, data) {
  if (data.length < 3) console.warn("Invalid length for setUniform3f " + name);
  this.gl.uniform3fv(this.getUniform(name), data);
}

/// @brief Wrapped call to uniform2fv.
/// 
/// @param name    String name of the variable to set.
/// @param data    Float32Array data to assign.
Shader.prototype.setUniform2f = function(name, data) {
  if (data.length < 2) console.warn("Invalid length for setUniform2f " + name);
  this.gl.uniform2fv(this.getUniform(name), data);
}

/// @brief Wrapped call to uniform1f.
/// 
/// @param name    String name of the variable to set.
/// @param data    Float data to assign.
Shader.prototype.setUniform1f = function(name, data) {
  this.gl.uniform1f(this.getUniform(name), data);
}

/// @brief Wrapped call to uniform1i.
/// 
/// @param name    String name of the variable to set.
/// @param data    Value to assign.
Shader.prototype.setUniform1i = function(name, data) {
  this.gl.uniform1i(this.getUniform(name), data);
}

/// @brief Wrapped call to uniformMatrix4fv.
/// 
/// @param name    String name of the variable to set.
/// @param data    Matrix4 data to assign.
Shader.prototype.setUniformMatrix4f = function(name, data) {
  this.gl.uniformMatrix4fv(this.getUniform(name), false, data.elements);
}

/// @brief Wrapped call to bindBuffer.
/// 
/// @param data    GL vertex buffer to bind.
Shader.prototype.setBuffer = function(data) {
  this.gl.bindBuffer(gl.ARRAY_BUFFER, data);
}

/// @brief Wrapped call to vertexAttribPointer of type vec2.
/// 
/// @param name     String name of the variable to set.
/// @param stride   Number of bytes per record.
/// @param offset   Offset in bytes from start of record.
/// 
/// @pre Assign buffer with a call to this.setBuffer().
Shader.prototype.setAttrib2f = function(name, stride, offset) {
  var location = this.getAttrib(name);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, stride, offset);
  gl.enableVertexAttribArray(location);
}

/// @brief Wrapped call to vertexAttribPointer of type vec3.
/// 
/// @param name     String name of the variable to set.
/// @param stride   Number of bytes per record.
/// @param offset   Offset in bytes from start of record.
/// 
/// @pre Assign buffer with a call to this.setBuffer().
Shader.prototype.setAttrib3f = function(name, stride, offset) {
  var location = this.getAttrib(name);
  gl.vertexAttribPointer(location, 3, gl.FLOAT, false, stride, offset);
  gl.enableVertexAttribArray(location);
}



/// ============================================================================
/// @class Material
/// 
/// @brief Contains one Shader, plus non-transform uniform params for that shader.
/// ============================================================================

/// @brief Constructor for the Material class.
/// 
/// @param scene     Scene to own this material.
/// @param shader    Shader to use when drawing this material.
function Material(scene, shader) {
  if (false == scene instanceof Scene) console.error("Invalid arg: scene");
  if (false == shader instanceof Shader) console.error("Invalid arg: shader");

  this.ID = scene.nextMaterialID++;
  this.dirty = true;

  this.scene = scene;
  this.shader = shader;

  var undefined;
  if (shader === undefined) {
    console.error("Undefined shader!");
  }

  this.floats = {};
  this.vec2s = {};
  this.vec3s = {};
  this.vec4s = {};

  this.setFloat('u_uvWeight', 0);

  this.setColor(new Float32Array([1.0, 1.0, 1.0]));
}


/// @brief Associate a uniform float.
/// 
/// @param name    String name of the shader variable.
/// @param data    Variable data.
Material.prototype.setFloat = function(name, data) {
  this.floats[name] = data;
  this.dirty = true;
  return this;
}


/// @brief Associate a uniform vec2.
/// 
/// @param name    String name of the shader variable.
/// @param data    Variable data.
Material.prototype.setVec2 = function(name, data) {
  if (data.length != 2) console.warn("Invalid length for setVec2 " + name);
  this.vec2s[name] = data;
  this.dirty = true;
  return this;
}


/// @brief Associate a uniform vec3.
/// 
/// @param name    String name of the shader variable.
/// @param data    Variable data.
Material.prototype.setVec3 = function(name, data) {
  if (data.length != 3) console.warn("Invalid length for setVec3 " + name);
  this.vec3s[name] = data;
  this.dirty = true;
  return this;
}


/// @brief Associate a uniform vec4.
/// 
/// @param name    String name of the shader variable.
/// @param data    Variable data.
Material.prototype.setVec4 = function(name, data) {
  if (data.length != 4) console.warn("Invalid length for setVec4 " + name);
  this.vec4s[name] = data;
  this.dirty = true;
  return this;
}


/// @brief Associate a color.
/// 
/// @param data    Variable data.
Material.prototype.setColor = function(data) {
  return this.setVec3('u_color', data);
}


/// @brief Associate a texture unit.
/// 
/// @param name    String name of the shader variable.
/// @param data    Variable data.
Material.prototype.setTextureUnit = function(data) {
  this.textureUnit = data;
  this.dirty = true;
  return this;
}


/// @brief Call before each shape draws.
/// 
/// @return True if material/shape values need to be passed in again (for example, switched shaders).
Material.prototype.preDraw = function() {
  var shader = this.shader;
  var undefined;

  var switchedShader = shader.preDraw();
  var switchedMaterial = this.scene.lastUsedMaterialID != this.ID;

  if (switchedShader || this.dirty || switchedMaterial) {

    for (var prop in this.floats) {
      shader.setUniform1f(prop, this.floats[prop]);
    }
    for (var prop in this.vec2s) {
      shader.setUniform2f(prop, this.vec2s[prop]);
    }
    for (var prop in this.vec3s) {
      shader.setUniform3f(prop, this.vec3s[prop]);
    }
    for (var prop in this.vec4s) {
      shader.setUniform4f(prop, this.vec4s[prop]);
    }    

    if (this.textureUnit !== undefined) {
      shader.setUniform1i('u_texture', this.textureUnit);
    }

    this.dirty = false;
    this.scene.lastUsedMaterialID = this.ID;
  }

  return switchedShader;
}



/// ============================================================================
/// @class Renderer
/// 
/// @brief Contains one Material, plus transform uniform data for that material.
/// ============================================================================


/// @brief Constructor for the Renderer class.
/// 
/// @param scene    Scene to own this renderer.
/// @param material    Material to use when drawing this object.
/// @param shape       Shape to use when drawing this object.
/// @param transform   Transform object to move this object around the scene. Leave null to create a default.
function Renderer(scene, material, shape, transform) {
  if (!(scene instanceof Scene)) console.error("Invalid arg: scene");
  if (!(material instanceof Material)) console.error("Invalid arg: material");
  if (!(shape instanceof Shape)) console.error("Invalid arg: shape");
  if (transform && !(transform instanceof Transform)) console.error("Invalid arg: transform");

  this.enabled = true;
  this.dirty = true;
  this.gl = scene.gl;

  this.scene = scene;
  this.material = material;
  this.shape = shape;
  this.transform = transform || new Transform();

  this.modelMatrix = new Matrix4();

  scene.addRenderer(this);
}


/// @brief Call before each shape draws.
/// 
/// @return True if material/shape values need to be passed in again (for example, switched shaders).
Renderer.prototype.preDraw = function() {
  this.modelMatrix.setIdentity();
  this.transform.apply(this.modelMatrix);

  var switchedShader = this.material.preDraw();
  this.shape.preDraw(switchedShader, this.material.shader);

  return switchedShader;
}


/// ============================================================================
/// @class Transform
/// 
/// Contains information to build a model matrix.
/// 
/// Each renderer is attached to a transform. Transforms can be attached to other transforms.
/// ============================================================================

/// @brief Constructor for the Transform class.
/// 
/// @param parent    Optional parent transform. You will move with your parent.
function Transform(parent) {
  if (parent && !(parent instanceof Transform)) console.error("Invalid arg: parent");

  this._scale = new Float32Array(3);
  this._rotate = new Float32Array(3);
  this._translate = new Float32Array(3);
  this.reset();
  this.parent = parent;

  this.dirty = true;

  //an internal matrix to cache changes
  this.matrix = new Matrix4();
}


/// @brief Reset this transform to default values.
Transform.prototype.reset = function() {
  for (var i=0; i<3; i++) {
    this._scale[i] = 1;
    this._rotate[i] = 0;
    this._translate[i] = 0;
  }
  this.dirty = true;
  return this;
}


/// @brief Apply this transform (and parents, if any) to given model matrix.
/// 
/// @param matrix    Incoming model matrix. Will be modified!
Transform.prototype.apply = function(matrix) {
  //apply parent transformations, first
  //note this step is recursive
  if (this.parent) {
    this.parent.apply(matrix);
  }

  //recalculate this transform's data, if it has changed
  if (this.dirty) {
    this.recalculate();
  }

  //apply this transform
  matrix.concat(this.matrix);

  //and return
  return matrix;
}


/// @brief Recalculate this transform's internal data.
/// 
/// Will be called automatically when needed.
Transform.prototype.recalculate = function() {
  this.matrix.setIdentity();

  //apply scaling, if any
  if (this.hasScale()) {
    var scaling = this._scale;
    this.matrix.scale(scaling[0], scaling[1], scaling[2]);
  }

  //apply rotation, if any
  if (this.hasRotate()) {
    var rotation = this._rotate;
    this.matrix.rotate(rotation[1], 0, 1, 0);
    this.matrix.rotate(rotation[0], 1, 0, 0);
    this.matrix.rotate(rotation[2], 0, 0, 1);
  }

  //apply translation, if any
  if (this.hasTranslate()) {
    var translation = this._translate;
    this.matrix.translate(translation[0], translation[1], translation[2]);
  }
  
  this.dirty = false;
}


/// @brief Does this transform apply any rotation?
Transform.prototype.hasRotate = function() {
  for (var i=0; i<3; i++) {
    if (this._rotate[i] != 0) return true;
  }
  return false;
}


/// @brief Does this transform apply any scaling?
Transform.prototype.hasScale = function() {
  for (var i=0; i<3; i++) {
    if (this._scale[i] != 1) return true;
  }
  return false;  
}


/// @brief Does this transform apply any translation?
Transform.prototype.hasTranslate = function() {
  for (var i=0; i<3; i++) {
    if (this._translate[i] != 0) return true;
  }
  return false;    
}


/// @brief Sets transform's scaling.
/// 
/// @param x    Axis value.
/// @param y    Axis value.
/// @param z    Axis value.
Transform.prototype.setScale = function(x, y, z) {
  this._scale[0] = x;
  this._scale[1] = y;
  this._scale[2] = z;
  this.dirty = true;
  return this;
}


/// @brief Multiplies transform's current scale.
/// 
/// @param x    Axis value.
/// @param y    Axis value.
/// @param z    Axis value.
Transform.prototype.scale = function(x, y, z) {
  this._scale[0] *= x;
  this._scale[1] *= y;
  this._scale[2] *= z;
  this.dirty = true;
  return this;
}


/// @brief Sets transform's rotation.
/// 
/// @param x    Axis value.
/// @param y    Axis value.
/// @param z    Axis value.
/// 
/// We apply rotation as Euler angles: about the y, x, and z axes, in that order.
Transform.prototype.setRotate = function(x, y, z) {
  this._rotate[0] = x;
  this._rotate[1] = y;
  this._rotate[2] = z;
  this.clampRotation();
  this.dirty = true;
  return this;
}


/// @brief Adds to transform's current rotation.
/// 
/// @param x    Axis value.
/// @param y    Axis value.
/// @param z    Axis value.
/// 
/// We apply rotation as Euler angles: about the y, x, and z axes, in that order. 
Transform.prototype.rotate = function(x, y, z) {
  this._rotate[0] += x;
  this._rotate[1] += y;
  this._rotate[2] += z;
  this.clampRotation();
  this.dirty = true;
  return this;
}


/// @brief Helper function to avoid out-of-bounds rotations.
Transform.prototype.clampRotation = function() {
  for (var i=0; i<3; i++) {
    while (this._rotate[i] >= 360) {
      this._rotate[i] -= 360;
    }
    while (this._rotate[i] < 0) {
      this._rotate[i] += 360;
    }
  }
}


/// @brief Sets transform's current translation.
/// 
/// @param x    Axis value.
/// @param y    Axis value.
/// @param z    Axis value.
Transform.prototype.setTranslate = function(x, y, z) {
  this._translate[0] = x;
  this._translate[1] = y;
  this._translate[2] = z;
  this.dirty = true;
  return this;
}


/// @brief Adds to transform's current translation.
/// 
/// @param x    Axis value.
/// @param y    Axis value.
/// @param z    Axis value.
Transform.prototype.translate = function(x, y, z) {
  this._translate[0] += x;
  this._translate[1] += y;
  this._translate[2] += z;
  this.dirty = true;
  return this;
}




/// ============================================================================
/// @class Shape
/// 
/// @brief Contains one geometry buffer. Can be used for draw calls.
/// ============================================================================

/// @brief Constructor for the shape class.
/// 
/// @param scene         Scene to own this shape.
/// @param bufferType    String indicating contents of data array. See usage notes.
/// @param prim          GL primitive to use when drawing this shape (ie: gl.TRIANGLES).
/// @param data          Float32Array of vertex attribute data.
/// 
/// @return Shape object.
/// 
/// Buffer types:
///     - 'pos2':            each vertex has a vec2 position
///     - 'pos2_uv':         each vertex has a vec2 position, vec2 uv
///     - 'pos3_norm_uv':    each vertex has a vec3 position, vec3 normal, vec2 uv
function Shape(scene, bufferType, prim, data) {
  if (!(scene instanceof Scene)) console.error("Invalid arg: scene");
  if (typeof bufferType !== 'string') console.error("Invalid arg: bufferType");
  if (typeof prim !== 'number') console.error("Invalid arg: prim");
  if (!(data instanceof Float32Array)) console.error("Invalid arg: data");

  this.ID = scene.nextShapeID++;
  this.dirty = true;

  var gl = scene.gl;
  this.gl = gl;
  this.bufferType = bufferType;
  this.prim = prim;
  this.scene = scene;

  this.buffer = gl.createBuffer();
  if (!this.buffer) {
    console.log("Failed to create buffer");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  switch (bufferType) {
    case 'pos2':
      this.numVerts = data.length / 2;
      break;

    case 'pos2_uv':
      this.numVerts = data.length / (2+2);
      break;

    case 'pos3_norm_uv':
      this.numVerts = data.length / (3+3+2);
      break;

    case 'pos3_norm_uv_uv2':
      this.numVerts = data.length / (3+3+2+2);
      break;
      
    default:
      console.error("Unrecognized buffer type" + this.bufferType);
      break;      
  }
}


/// @brief Called before drawing this shape.
/// 
/// @param switchedShader    Have we switched shaders during this draw call?
/// @param shader            Current GL shader.
/// 
/// If we have switched shaders, we will need to re-assign the vertex attributes from our buffer.
Shape.prototype.preDraw = function(switchedShader, shader) {
  var gl = this.gl;

  var switchedShape = this.scene.lastUsedShapeID != this.ID;

  if (switchedShader || this.dirty || switchedShape) {
    switch (this.bufferType) {
      case 'pos2':
        shader.setBuffer(this.buffer);
        shader.setAttrib2f('a_pos', 0, 0);

        if (shader.wantsNormals) console.warn("shader wants data we don't have");
        if (shader.wantsUV1) console.warn("shader wants data we don't have");
        if (shader.wantsUV2) console.warn("shader wants data we don't have");
        break;
                
      case 'pos2_uv':
        shader.setBuffer(this.buffer);
        shader.setAttrib2f('a_pos', FSIZE * 4, FSIZE * 0);
        if (shader.wantsUV1) shader.setAttrib2f('a_uv', FSIZE * 4, FSIZE * 2);

        if (shader.wantsNormals) console.warn("shader wants data we don't have");
        if (shader.wantsUV2) console.warn("shader wants data we don't have");
        break;

      case 'pos3_norm_uv':
        shader.setBuffer(this.buffer);
        shader.setAttrib3f('a_pos', FSIZE * 8, FSIZE * 0);
        if (shader.wantsUV1) shader.setAttrib3f('a_normal', FSIZE * 8, FSIZE * 3);

        if (shader.wantsNormals) console.warn("shader wants data we don't have");
        if (shader.wantsUV2) console.warn("shader wants data we don't have");
        break;

      case 'pos3_norm_uv_uv2':
        shader.setBuffer(this.buffer);
        shader.setAttrib3f('a_pos', FSIZE * 10, FSIZE * 0);
        if (shader.wantsNormals) shader.setAttrib3f('a_normal', FSIZE * 10, FSIZE * 3);
        if (shader.wantsUV1) shader.setAttrib2f('a_uv', FSIZE * 10, FSIZE * 6);
        if (shader.wantsUV2) shader.setAttrib2f('a_uv2', FSIZE * 10, FSIZE * 8);
        break;

      default:
        console.error("Unrecognized buffer type " + this.bufferType);
        break;
    }

    this.dirty = false;
    this.scene.lastUsedShapeID = this.ID;
  }  
}


///============================================================================
/// @class Camera
///
/// @brief View and projection data.
///============================================================================

/// @brief Constructor for the Camera class.
/// 
/// @param scene    Scene to own this camera.
function Camera(scene) {
  if (!(scene instanceof Scene)) console.error("Invalid arg: scene");

  this.scene = scene;

  //view and projection matrices
  this.viewMatrix = new Matrix4();
  this.projMatrix = new Matrix4();

  //cached combination of view/proj matrices
  this.viewProjMatrix = new Matrix4();

  this.tempMatrix = new Matrix4();
  this.tempMatrix0 = new Matrix4();
  this.dirty = true;
}


/// @brief Updates the camera's view matrix.
/// 
/// @param eyeX       Where is the camera?
/// @param eyeY       Where is the camera?
/// @param eyeZ       Where is the camera?
/// @param centerX    What is the camera looking at?
/// @param centerY    What is the camera looking at?
/// @param centerZ    What is the camera looking at?
/// @param upX        Camera's opinion of "up".
/// @param upY        Camera's opinion of "up".
/// @param upZ        Camera's opinion of "up".
Camera.prototype.setLookAt = function(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) {
  this.viewMatrix.setLookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ);
  this.dirty = true;
}


/// @brief Updates the camera's projection matrix.
/// 
/// @param fovy      Field of view, in degrees.
/// @param aspect    Ratio of horizontal to vertical viewing angle.
/// @param near      Near clipping distance.
/// @param far       Far clipping distance.
Camera.prototype.setPerspective = function(fovy, aspect, near, far) {
  this.projMatrix.setPerspective(fovy, aspect, near, far);
  this.dirty = true;
}

/// @brief Called before the camera draws.
Camera.prototype.preDraw = function() {
  if (this.dirty) {
    this.viewProjMatrix.setIdentity();
    this.viewProjMatrix.set(this.projMatrix);
    this.viewProjMatrix.multiply(this.viewMatrix);
    this.dirty = false;
  }
}

/// @brief Draw one renderer.
/// 
/// @param renderer    The renderer to draw.
Camera.prototype.draw = function(renderer) {
  //issue preDraw calls
  this.preDraw();
  var switchedShader = renderer.preDraw();

  //send light data to shader
  this.scene.light.preDraw(renderer.material.shader, switchedShader);

  //model-view-projection matrix
  var mat = this.tempMatrix;
  mat.set(this.viewProjMatrix);
  mat.multiply(renderer.modelMatrix);

  //normal: inverse-transpose matrix
  var mat0 = this.tempMatrix0;
  mat0.setInverseOf(renderer.modelMatrix).transpose();

  //send MVP to shader
  var shader = renderer.material.shader;
  shader.setUniformMatrix4f('u_transform', mat);
  if (shader.wantsNormals) shader.setUniformMatrix4f('u_normTransform', mat0);

  //draw call
  var gl = this.scene.gl;
  var shape = renderer.shape;
  gl.drawArrays(shape.prim, 0, shape.numVerts);
}


///@brief Draw multiple renderers.
///
///@param renderers    An array of renderers to draw.
Camera.prototype.drawAll = function(renderers) {
  var count = renderers.length;
  for (var i=0; i<count; i++) {
    if (renderers[i].enabled) {
      this.draw(renderers[i]);
    }
  }
}



///============================================================================
/// @class Light
///
/// @brief Light information for the scene.
///============================================================================

/// @brief Constructor for the Lights class.
function Light()  {
  this.ambientLightColor = new Float32Array([0.5, 0.5, 0.5]);
  this.dirLightColor = new Float32Array([1.0, 1.0, 1.0]);
  this.dirLightDir = new Float32Array([1.0, 0.0, 0.0]);
  this.dirty = true;
}


/// @brief Call before drawing.
///
/// @param shader            Shader object to use with this draw call.
/// @param switchedShader    True if we've switched shaders during this draw call.
Light.prototype.preDraw = function(shader, switchedShader) {
  if (switchedShader || this.dirty) {
    if (shader.wantsAmbientLight) {
      shader.setUniform3f('u_ambientLightColor', this.ambientLightColor);
    }
    if (shader.wantsDiffuseLight) {
      shader.setUniform3f('u_lightDir', this.dirLightDir);
      shader.setUniform3f('u_lightColor', this.dirLightColor);
    }
    this.dirty = false;
  }
}




///============================================================================
/// @class Mathx
/// 
/// @brief Static utility class.
/// 
/// Note: For some reason, embedding this directly in the game source runs faster.
///       Needs more research!
///============================================================================

var Mathx = {};


/// @brief Clamps a value between min and max.
/// 
/// @param min    Numeric. Lowest possible return value.
/// @param max    Numeric. Highest possible return value.
/// @param val    Numeric. Value to clamp.
/// 
/// @return Clamped value.
Mathx.clamp = function(min, max, val) {
  return Math.max(Math.min(val, max), min);
}

/// @brief Linear interpolation between two values.
/// 
/// @param min    Numeric. Lowest possible return value.
/// @param max    Numeric. Highest possible return value.
/// @param perc   Numeric [0,1]. Percentage weight for interpolation.
/// 
/// @return Numeric result of interpolation.
Mathx.lerp = function(min, max, perc) {
  if (min > max) {
    return Mathx.lerp(max, min, 1 - perc);
  } else {
    return Mathx.clamp(min, max, min + (max-min) * perc);
  }
}

/// @brief Reverses a linear interpolation: given an output, what percentage would generate it?
/// 
/// @param min    Numeric. Lowest possible input value.
/// @param max    Numeric. Highest possible input value.
/// @param val    Numeric. What percentage would we need to get this as lerp output?
/// 
/// @return Lerp percentage to interpolate val between min and max.
Mathx.inverseLerp = function(min, max, val) {
  if (val >= max) return 1.0;
  else if (val <= min) return 0.0;
  else return (val-min) / (max-min);
}

/// @brief Checks if a value is between min and max.
/// 
/// @param min    Numeric. Lowest acceptable value.
/// @param max    Numeric. Highest acceptable value.
/// @param val    Numeric. Value to check.
/// 
/// @return True if val is within range, false otherwise.
Mathx.rangeCheck = function(min, max, val) {
  return (val >= min && val <= max);
}

/// @brief Linear interpolation between two vector values.
/// 
/// @param target    Provide a destination vector, to avoid GC allocation.
/// @param a         Array. Lowest possible return value.
/// @param b         Array. Highest possible return value.
/// @param perc      Numeric [0,1]. Percentage weight for interpolation.
/// 
/// @return Target (maybe redundant, since it was passed by ref anyway).
Mathx.lerpVec = function(target, a, b, t) {
  for (var i=0; i<a.length && i<b.length; i++) {
    target[i] = Mathx.lerp(a[i], b[i], t);
  }
  return target;
}