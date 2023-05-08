
uniform float time;
uniform sampler2D positionTexture;
 
varying vec3 vPosition;
varying vec2 vuv;

attribute vec2 pIndex;

void main() {
    vec3 pos = texture2D(positionTexture, pIndex).xyz;

    vuv = pIndex;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0 * (1.0 / - mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
}