import Terminal from "./Terminal.jsx";
import Sidebar from "./Sidebar.jsx";
import WelcomeScreen from "./WelcomeScreen.jsx";
import FinishScreen from "./FinishScreen.jsx";

function App(){

    return(
        <div className="flex h-screen w-screen">
          <WelcomeScreen />
          <FinishScreen />
          <Terminal/>
          <Sidebar/>
        </div>
    );
}


export default App


