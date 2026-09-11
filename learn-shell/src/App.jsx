import Terminal from "./Terminal.jsx";
import Sidebar from "./Sidebar.jsx";


function App(){

    return(
        <div className="flex h-screen w-screen">
          <Terminal/>
          <Sidebar/>
        </div>
    );
}


export default App
