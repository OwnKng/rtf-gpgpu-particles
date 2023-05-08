uniform float uTime;
uniform float delta;

void main()	{
    vec2 uv = gl_FragCoord.xy / resolution.xy;
	vec4 tmpPos = texture2D(texturePosition, uv);
	vec3 position = tmpPos.xyz;
	vec3 velocity = texture2D(textureVelocity, uv).xyz;
    
    gl_FragColor = vec4(position + velocity * delta * 15. , 1.0);
}