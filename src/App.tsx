import "./App.css"
import Sketch from "./Sketch"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"

function App() {
  return (
    <div className='App'>
      <Canvas shadows>
        <OrbitControls />
        <ambientLight intensity={0.2} />
        <pointLight castShadow position={[0, 10, 0]} />
        <Sketch />
      </Canvas>
    </div>
  )
}

export default App
