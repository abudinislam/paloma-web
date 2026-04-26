// auth.jsx — login
function Field({label,value,onChange,placeholder,type,required}){
  const [focus,setFocus]=useState(false);
  return(
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--t2)',marginBottom:5}}>{label}</label>
      <input type={type||'text'} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} required={required}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{width:'100%',padding:'10px 12px',borderRadius:8,boxSizing:'border-box',
          border:`1.5px solid ${focus?'var(--acc)':'var(--bdr)'}`,
          background:'var(--card)',color:'var(--t1)',fontSize:13,outline:'none',
          fontFamily:'inherit',transition:'border-color .15s'}}/>
    </div>
  );
}

function AuthPage({setPage,onLogin}){
  const {add,el:toastEl}=useToast();
  const [form,setForm]=useState({password:''});
  const [loading,setLoading]=useState(false);
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));

  const submit=async e=>{
    e.preventDefault();
    setLoading(true);
    try{
      const res=await fetch('/api/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({password:form.password})
      });
      const data=await res.json();
      if(res.ok){
        add('Добро пожаловать!','ok');
        onLogin&&onLogin();
        setTimeout(()=>setPage('app'),700);
      } else {
        add(data.error||'Неверный пароль','err');
      }
    } catch {
      add('Ошибка соединения','err');
    } finally {
      setLoading(false);
    }
  };

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column'}}>
      <nav style={{background:'var(--card)',borderBottom:'1px solid var(--bdr)',padding:'0 28px',
        height:58,display:'flex',alignItems:'center'}}>
        <Logo onClick={()=>setPage('landing')}/>
      </nav>

      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'32px 20px'}}>
        <div style={{width:'100%',maxWidth:400}}>
          <div style={{background:'var(--card)',borderRadius:18,
            boxShadow:'0 8px 40px rgba(0,0,0,.10)',border:'1px solid var(--bdr)',overflow:'hidden'}}>

            <div style={{background:`linear-gradient(135deg, var(--sb) 0%, oklch(0.22 0.06 240) 100%)`,
              padding:'28px 32px'}}>
              <Logo light/>
              <div style={{marginTop:14,fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,
                color:'#fff',letterSpacing:'-.02em',lineHeight:1.1}}>
                Вход в ScanlyAI
              </div>
              <div style={{fontSize:13,color:'oklch(1 0 0 / 0.5)',marginTop:5}}>
                Введите пароль доступа
              </div>
            </div>

            <form onSubmit={submit} style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:14}}>
              <Field label="Пароль" value={form.password} onChange={v=>upd('password',v)}
                placeholder="••••••••" type="password" required/>

              <button type="submit" disabled={loading} style={{marginTop:6,width:'100%',padding:'12px',borderRadius:9,
                background:'var(--acc)',color:'#fff',border:'none',cursor:loading?'not-allowed':'pointer',
                fontSize:14,fontWeight:700,letterSpacing:'-.01em',opacity:loading?.7:1,
                boxShadow:`0 4px 18px oklch(0.62 0.13 185 / 0.3)`,transition:'background .15s'}}
                onMouseEnter={e=>{if(!loading)e.currentTarget.style.background='var(--accd)'}}
                onMouseLeave={e=>e.currentTarget.style.background='var(--acc)'}>
                {loading?'Вхожу…':'Войти →'}
              </button>

              <div style={{textAlign:'center',fontSize:12,color:'var(--t3)',marginTop:4,lineHeight:1.5}}>
                Нет доступа? Обратитесь к администратору.
              </div>
            </form>
          </div>
        </div>
      </div>
      {toastEl}
    </div>
  );
}

Object.assign(window,{AuthPage,Field});
