// main.jsx — root component + routing
function App(){
  const [page,setPage]=useState('landing');
  const [loggedIn,setLoggedIn]=useState(false);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    fetch('/api/quota')
      .then(r=>{
        if(r.ok)setLoggedIn(true);
        else if(r.status===401)setLoggedIn(false);
      })
      .catch(()=>setLoggedIn(false))
      .finally(()=>setChecking(false));
  },[]);

  const navigate=p=>{
    const protected_=['app','cabinet'];
    if(protected_.includes(p)&&!loggedIn){
      setPage('auth');
    } else {
      setPage(p);
    }
  };

  if(checking){
    return(
      <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <Logo/>
          <div style={{marginTop:16,fontSize:13,color:'var(--t3)'}}>Загрузка…</div>
        </div>
      </div>
    );
  }

  const props={setPage:navigate,onLogout:()=>setLoggedIn(false),onLogin:()=>setLoggedIn(true)};

  switch(page){
    case 'landing':  return <LandingPage  {...props}/>;
    case 'auth':     return <AuthPage     {...props}/>;
    case 'app':      return <OcrPage      {...props}/>;
    case 'cabinet':  return <CabinetPage  {...props}/>;

    default:         return <LandingPage  {...props}/>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
