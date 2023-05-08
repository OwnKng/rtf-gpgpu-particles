import { useMemo, useRef } from "react"
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

import position from "./shaders/simulation/position.glsl"
import velocity from "./shaders/simulation/velocity.glsl"

import fragment from "./shaders/particles/fragment.glsl"
import vertex from "./shaders/particles/vertex.glsl"

const WIDTH = 800
const BOUNDS = 16

const fillDataTexture = (texture: THREE.DataTexture) => {
  const data = texture.image.data

  for (let i = 0; i < data.length; i += 4) {
    data[i + 0] = 0
    data[i + 1] = 0
    data[i + 2] = 0
    data[i + 3] = 1
  }
}

const getPoint = (v: THREE.Vector3, size: number): THREE.Vector3 => {
  v.x = Math.random() * 2 - 1
  v.y = Math.random() * 2 - 1
  v.z = Math.random() * 2 - 1
  if (v.length() > 1) return getPoint(v, size)
  return v.normalize().multiplyScalar(size)
}

const getSphere = (count: number, size: number) => {
  const tempVector = new THREE.Vector3()
  const len = count * 3
  const data = new Float32Array(len)
  const p = tempVector.clone()
  for (let i = 0; i < len; i += 4) {
    getPoint(p, size)
    data[i] = p.x
    data[i + 1] = p.y
    data[i + 2] = p.z
    data[i + 3] = 1
  }
  return data
}

const Sketch = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const { gl } = useThree()

  const cursor = useRef(new THREE.Vector3(0, 0, 0))

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      positionTexture: { value: null },
      velocityTexture: { value: null },
    }),
    []
  )

  //_ Create the fbo and simulation data
  const [gpuCompute, positionTexture, velocityTexture] = useMemo(() => {
    const gpuRender = new GPUComputationRenderer(WIDTH, WIDTH, gl)

    const dataA = getSphere(WIDTH * WIDTH * 4, BOUNDS)
    const dataTextureA = new THREE.DataTexture(
      dataA,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    dataTextureA.needsUpdate = true

    const dataTexturePosition = gpuRender.createTexture()
    fillDataTexture(dataTexturePosition)

    const dataTextureVelocity = gpuRender.createTexture()
    fillDataTexture(dataTextureVelocity)

    const positionTexture = gpuRender.addVariable(
      "texturePosition",
      position,
      dataTexturePosition
    )
    const velocityTexture = gpuRender.addVariable(
      "textureVelocity",
      velocity,
      dataTextureVelocity
    )

    gpuRender.setVariableDependencies(positionTexture, [
      positionTexture,
      velocityTexture,
    ])

    gpuRender.setVariableDependencies(velocityTexture, [
      velocityTexture,
      positionTexture,
    ])

    positionTexture.material.uniforms.uTime = { value: 0.0 }
    velocityTexture.material.uniforms.uTime = { value: 0.0 }
    positionTexture.material.uniforms.delta = { value: 0.0 }
    velocityTexture.material.uniforms.delta = { value: 0.0 }
    velocityTexture.material.uniforms.originalPosition = { value: dataTextureA }

    velocityTexture.material.uniforms.maxSpeed = { value: 1 }
    velocityTexture.material.uniforms.maxForce = { value: 0.1 }

    velocityTexture.material.uniforms.uMouse = { value: cursor.current }

    positionTexture.wrapS = THREE.RepeatWrapping
    positionTexture.wrapT = THREE.RepeatWrapping
    velocityTexture.wrapS = THREE.RepeatWrapping
    velocityTexture.wrapT = THREE.RepeatWrapping

    gpuRender.init()

    return [gpuRender, positionTexture, velocityTexture]
  }, [gl])

  // Buffer attributes for the presentational layer
  const [positions, pIndex] = useMemo(
    () => [
      Float32Array.from(new Array(WIDTH * WIDTH * 3).fill(0)),
      Float32Array.from(
        new Array(WIDTH * WIDTH)
          .fill(0)
          .flatMap((_, i) => [
            (i % WIDTH) / WIDTH,
            Math.floor(i / WIDTH) / WIDTH,
          ])
      ),
    ],
    []
  )

  useFrame(({ clock }, delta) => {
    gpuCompute.compute()

    positionTexture.material.uniforms.uTime.value = clock.getElapsedTime()
    velocityTexture.material.uniforms.uTime.value = clock.getElapsedTime()

    positionTexture.material.uniforms.delta.value = delta
    velocityTexture.material.uniforms.delta.value = delta

    materialRef.current.uniforms.positionTexture.value =
      gpuCompute.getCurrentRenderTarget(positionTexture).texture

    materialRef.current.uniforms.velocityTexture.value =
      gpuCompute.getCurrentRenderTarget(velocityTexture).texture

    materialRef.current.uniforms.uTime.value = clock.getElapsedTime()

    materialRef.current.uniformsNeedUpdate = true
  })

  return (
    <>
      <mesh
        onPointerMove={(e) =>
          (velocityTexture.material.uniforms.uMouse.value = e.point)
        }
      >
        <icosahedronGeometry args={[BOUNDS, 1]} />
        <meshBasicMaterial
          side={THREE.DoubleSide}
          transparent={true}
          opacity={0}
        />
      </mesh>
      <points>
        <bufferGeometry attach='geometry'>
          <bufferAttribute
            attach='attributes-position'
            array={positions}
            count={positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach='attributes-pIndex'
            array={pIndex}
            count={pIndex.length / 2}
            itemSize={2}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          blending={THREE.AdditiveBlending}
          transparent
          side={THREE.DoubleSide}
        />
      </points>
    </>
  )
}

export default Sketch
