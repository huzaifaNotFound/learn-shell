import Terminal from "./Terminal.jsx";
import Sidebar from "./Sidebar.jsx";
import WelcomeScreen from "./WelcomeScreen.jsx";


function App(){

    return(
        <div className="flex h-screen w-screen">
          <WelcomeScreen />
          <Terminal/>
          <Sidebar/>
        </div>
    );
}


export default App


