uniform float uTime;
uniform float delta;
uniform vec3 uMouse;

uniform float maxSpeed; 
uniform float maxForce; 

uniform sampler2D originalPosition; 

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec3 seek(vec3 target, vec3 position, vec3 velocity, bool arrival) {
    vec3 force = target - position; 
    float desiredSpeed = maxSpeed;
    float r = 10.0; 

    if(arrival) {
        float slowRadius = 2.0;
        // get the length of the vector force
        float d = length(force);

        if(d < r) {
            desiredSpeed = map(d, 0.0, r, 0.0, maxSpeed);
            force = normalize(force) * desiredSpeed;

        } else {
            force = normalize(force) * maxSpeed;
        }
    }

    vec3 steer = force - velocity;

    // limit the force according to maxForce 
    if(length(steer) > maxForce) {
        steer = normalize(steer) * maxForce;
    }

    return steer;
}

vec3 arrive (vec3 target, vec3 position, vec3 velocity) {
    return seek(target, position, velocity, true);
}

vec3 flee (vec3 target, vec3 position, vec3 velocity) {
    return seek(target, position, velocity, false) * -1.0;
}

void main()	{
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 originalPos = texture2D(originalPosition, uv).xyz;
	vec3 velocity = texture2D(textureVelocity, uv).xyz;
    vec3 position = texture2D(texturePosition, uv).xyz;

    // Calculate distance to umouse
    float dist = distance(uMouse, position);

    // caculate direction from umouse to position
    vec3 dir = normalize(uMouse - position);


   if(dist < 2.0) {
        velocity += flee(uMouse, position, velocity);
   } else {
        velocity += arrive(originalPos, position, velocity);
   }


    // If the posiiton is close to the umouse, create a new force that moves it away
    gl_FragColor = vec4(velocity, 1.0);
}