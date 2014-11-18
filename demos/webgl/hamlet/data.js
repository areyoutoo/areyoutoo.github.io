var data = {};


// The cube!
//
// Mesh data columns:
//
//    - vertex position
//    - vertex normal
//    - UV1
//    - UV2
//
// Normals point directly outward from the cube's face.
//
// UV2 gives each cube face the full texture. (use for ground, etc.)
//
// UV1 textures each cube face separately, like so:
//
//    0.00      0.25      0.50      0.75      1.00
//
//                        +---------+                0.75
//                        |         |
//                        | top     |
//                        |         |
//    +---------+---------+---------+---------+      0.50
//    |         |         |         |         |
//    | back    | left    | front   | right   |
//    |         |         |         |         |
//    +---------+---------+---------+---------+      0.25
//                        |         |
//                        | bottom  |
//                        |         |
//                        +---------+                0.00
//
// So, here's the cube:
data.cubeVerts = new Float32Array([
  //bottom
   0.5,  0.0,  0.5,     0.0, -1.0,  0.0,    0.75, 0.25,    1, 1,
  -0.5,  0.0,  0.5,     0.0, -1.0,  0.0,    0.50, 0.25,    0, 1,
   0.5,  0.0, -0.5,     0.0, -1.0,  0.0,    0.75, 0.00,    1, 0,
   0.5,  0.0, -0.5,     0.0, -1.0,  0.0,    0.75, 0.00,    1, 0,
  -0.5,  0.0,  0.5,     0.0, -1.0,  0.0,    0.50, 0.25,    0, 1,
  -0.5,  0.0, -0.5,     0.0, -1.0,  0.0,    0.50, 0.00,    0, 0,
  
  //back
  -0.5,  0.0, -0.5,     0.0,  0.0, -1.0,    0.25, 0.25,    1, 1,
  -0.5,  1.0, -0.5,     0.0,  0.0, -1.0,    0.25, 0.50,    0, 1,
   0.5,  0.0, -0.5,     0.0,  0.0, -1.0,    0.00, 0.25,    1, 0,
   0.5,  0.0, -0.5,     0.0,  0.0, -1.0,    0.00, 0.25,    1, 0,
  -0.5,  1.0, -0.5,     0.0,  0.0, -1.0,    0.25, 0.50,    0, 1,
   0.5,  1.0, -0.5,     0.0,  0.0, -1.0,    0.00, 0.50,    0, 0,
  
  //left
  -0.5,  1.0,  0.5,    -1.0,  0.0,  0.0,    0.50, 0.50,    1, 1,
  -0.5,  1.0, -0.5,    -1.0,  0.0,  0.0,    0.25, 0.50,    0, 1,
  -0.5,  0.0,  0.5,    -1.0,  0.0,  0.0,    0.50, 0.25,    1, 0,
  -0.5,  0.0,  0.5,    -1.0,  0.0,  0.0,    0.50, 0.25,    1, 0,
  -0.5,  1.0, -0.5,    -1.0,  0.0,  0.0,    0.25, 0.50,    0, 1,
  -0.5,  0.0, -0.5,    -1.0,  0.0,  0.0,    0.25, 0.25,    0, 0,
  
  //front
   0.5,  1.0,  0.5,     0.0,  0.0,  1.0,    0.75, 0.50,    1, 1,
  -0.5,  1.0,  0.5,     0.0,  0.0,  1.0,    0.50, 0.50,    0, 1,
   0.5,  0.0,  0.5,     0.0,  0.0,  1.0,    0.75, 0.25,    1, 0,
   0.5,  0.0,  0.5,     0.0,  0.0,  1.0,    0.75, 0.25,    1, 0,
  -0.5,  1.0,  0.5,     0.0,  0.0,  1.0,    0.50, 0.50,    0, 1,
  -0.5,  0.0,  0.5,     0.0,  0.0,  1.0,    0.50, 0.25,    0, 0,
  
  //right
   0.5,  0.0, -0.5,     1.0,  0.0,  0.0,    1.00, 0.25,    1, 1,
   0.5,  1.0, -0.5,     1.0,  0.0,  0.0,    1.00, 0.50,    0, 1,
   0.5,  0.0,  0.5,     1.0,  0.0,  0.0,    0.75, 0.25,    1, 0,
   0.5,  0.0,  0.5,     1.0,  0.0,  0.0,    0.75, 0.25,    1, 0,
   0.5,  1.0, -0.5,     1.0,  0.0,  0.0,    1.00, 0.50,    0, 1,
   0.5,  1.0,  0.5,     1.0,  0.0,  0.0,    0.75, 0.50,    0, 0,
  
  //top
  -0.5,  1.0, -0.5,     0.0,  1.0,  0.0,    0.50, 0.75,    1, 1,
  -0.5,  1.0,  0.5,     0.0,  1.0,  0.0,    0.50, 0.50,    0, 1,
   0.5,  1.0, -0.5,     0.0,  1.0,  0.0,    0.75, 0.75,    1, 0,
   0.5,  1.0, -0.5,     0.0,  1.0,  0.0,    0.75, 0.75,    1, 0,
  -0.5,  1.0,  0.5,     0.0,  1.0,  0.0,    0.50, 0.50,    0, 1,
   0.5,  1.0,  0.5,     0.0,  1.0,  0.0,    0.75, 0.50,    0, 0,
]);


// Data for time-of-day system
//
//   - label                User-friendly label. Handy for debugging!
//   - timeOfDay            0,1 percent through day.
//   - lightPos             Diffuse light position.
//   - lightColor           Diffuse light color.
//   - ambientLightColor    Just what it says on the tin.
//   - skyColor             Clear color (sky is background).
//   - numStars             How many stars should be active?
//
// In general, the system picks current/next TOD values, then interpolates.
data.maxStars = 100;
data.timeStates = [
  {
    label: 'midnight',
    timeOfDay: 0 / 24,
    lightPos: new Float32Array([0, 100, 0]),
    lightColor: new Float32Array([0.26, 0.62, 0.8]),
    ambientLightColor: new Float32Array([0.2, 0.2, 0.45]),
    skyColor: new Float32Array([0.06, 0.12, 0.5]),
    numStars: data.maxStars,
  },
  {
    label: 'stars down',
    timeOfDay: 4 / 24,
    lightPos: new Float32Array([0, 100, 0]),
    lightColor: new Float32Array([0.26, 0.62, 0.73]),
    ambientLightColor: new Float32Array([0.2, 0.2, 0.4]),
    skyColor: new Float32Array([0.06, 0.12, 0.5]),
    numStars: data.maxStars,
  },
  {
    label: 'dawn begins',
    timeOfDay: 6 / 24,
    lightPos: new Float32Array([100, 100, 0]),
    lightColor: new Float32Array([0.42, 0.62, 0.73]),
    ambientLightColor: new Float32Array([0.3, 0.3, 0.3]),
    skyColor: new Float32Array([0.12, 0.24, 0.7]),
    numStars: Math.floor(data.maxStars * 0.2),
  },
  {
    label: 'dawn ends',
    timeOfDay: 9 / 24,
    lightPos: new Float32Array([90, 100, 10]),
    lightColor: new Float32Array([0.6, 0.6, 0.4]),
    ambientLightColor: new Float32Array([0.35, 0.3, 0.3]),
    skyColor: new Float32Array([0.65, 0.85, 1.0]),
    numStars: 0,
  },
  {
    label: 'noon',
    timeOfDay: 12 / 24,
    lightPos: new Float32Array([0, 100, -100]),
    lightColor: new Float32Array([0.65, 0.65, 0.55]),
    ambientLightColor: new Float32Array([0.6, 0.6, 0.5]),
    skyColor: new Float32Array([0.65, 0.85, 1.0]),
    numStars: 0,
  },
  {
    label: 'sunset begins',
    timeOfDay: 16 / 24,
    lightPos: new Float32Array([-90, 100, 10]),
    lightColor: new Float32Array([0.55, 0.55, 0.45]),
    ambientLightColor: new Float32Array([0.4, 0.3, 0.3]),
    skyColor: new Float32Array([0.95, 0.75, 1.0]),
    numStars: 0,
  },
  {
    label: 'sunset ends',
    timeOfDay: 19 / 24,
    lightPos: new Float32Array([-100, 100, 0]),
    lightColor: new Float32Array([0.26, 0.62, 0.73]),
    ambientLightColor: new Float32Array([0.3, 0.3, 0.5]),
    skyColor: new Float32Array([0.06, 0.12, 0.7]),
    numStars: Math.floor(data.maxStars * 0.1),
  },
  {
    label: 'stars up',
    timeOfDay: 20 / 24,
    lightPos: new Float32Array([0, 100, 0]),
    lightColor: new Float32Array([0.26, 0.62, 0.73]),
    ambientLightColor: new Float32Array([0.2, 0.2, 0.4]),
    skyColor: new Float32Array([0.06, 0.12, 0.5]),
    numStars: data.maxStars,
  },      
  {
    label: 'midnight',
    timeOfDay: 24 / 24,
    lightPos: new Float32Array([0, 100, 0]),
    lightColor: new Float32Array([0.26, 0.62, 0.8]),
    ambientLightColor: new Float32Array([0.2, 0.2, 0.45]),
    skyColor: new Float32Array([0.06, 0.12, 0.5]),
    numStars: data.maxStars,
  },  
];


//main shader
//  - includes ambient, diffuse lighting
//  - supports two UV spaces for texturing
//  - assumes full normal transform, for non-uniform scaling
data.shaderMain = {
  vert: [
    'uniform mat4 u_transform;',
    'uniform mat4 u_normTransform;',
    'uniform vec3 u_color;',
    'uniform float u_uvWeight;',
    '',
    'uniform vec3 u_lightDir;',
    'uniform vec3 u_lightColor;',
    'uniform vec3 u_ambientLightColor;',
    '',
    'attribute vec4 a_pos;',
    'attribute vec4 a_normal;',
    'attribute vec2 a_uv;',
    'attribute vec2 a_uv2;',
    '',
    'varying vec2 v_uv;',
    'varying vec3 v_lightColor;',
    '',
    'void main() {',
    ' gl_Position = u_transform * a_pos;',
    ' v_uv = mix(a_uv, a_uv2, u_uvWeight);',
    '',
    ' vec3 normal = normalize((u_normTransform * a_normal).xyz);',
    ' float normalDot = max(dot(normalize(u_lightDir), normal), 0.0);',
    ' vec3 diffuse = u_lightColor * u_color * normalDot;',
    '',
    ' vec3 ambient = u_ambientLightColor * u_color;',
    '',
    ' v_lightColor = diffuse + ambient;',
    '}',
  ].join('\n'),

  frag: [
    'precision mediump float;',
    '',
    'uniform sampler2D u_texture;',
    '',
    'varying vec2 v_uv;',
    'varying vec3 v_lightColor;',
    '',
    'void main() {',
    ' gl_FragColor = texture2D(u_texture, v_uv) * vec4(v_lightColor, 1.0);',
    '}',    
  ].join('\n'),
};


//shader for the stars in the sky
//we just want these stars to be white all the time
data.shaderStar = {
 vert: [
    'uniform mat4 u_transform;',
    '',
    'attribute vec4 a_pos;',
    '',
    'void main() {',
    ' gl_Position = u_transform * a_pos;',
    '}',
  ].join('\n'),


  frag: [
    'precision mediump float;',
    '',
    'uniform vec3 u_color;',
    '',
    'void main() {',
    '  gl_FragColor = vec4(u_color, 1);',
    '}',
  ].join('\n'),
};