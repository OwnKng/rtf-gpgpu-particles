
uniform float uTime;
uniform sampler2D positionTexture;
uniform sampler2D textureA;
uniform sampler2D textureB;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 tempPosition = texture2D(positionTexture, uv);

    float frequency = 2.0;
    float amplitude = 0.001;

        // origin
    vec3 origin = texture2D(textureA, uv).xyz;

        //destination
    vec3 destination = texture2D(textureB, uv).xyz;

        // time
    float t = sin(uTime) * 0.5 + 0.5; 

    vec3 pos = mix(origin, destination, t);
    gl_FragColor = vec4(pos, 1.0);
}

