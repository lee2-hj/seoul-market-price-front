import { Toaster } from "@/components/ui/sonner";
import Router from "./routes/Router";


function App() {


  return (

    <>
      <Router />
      <Toaster position="top-center" richColors />
    </>

  );

}


export default App;