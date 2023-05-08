
varying vec2 vuv;

void main() {
    // make a circle pattern 
    float d = distance(vuv, vec2(0.5, 0.5));

    if (d > 0.5) {
        discard;
    }

    gl_FragColor = vec4(vec3(1.0, 1.0, 1.0), 0.2);
}