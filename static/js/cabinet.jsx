// cabinet.jsx — file history
function CabinetPage({setPage,onLogout}){
  const {add,el:toastEl}=useToast();
  const [history,setHistory]=useState([]);
  const [stats,setStats]=useState({today:0,total:0,items:0});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch('/api/history')
      .then(r=>r.json())
      .then(data=>{
        setHistory(data.entries||[]);
        setStats({today:data.today_count||0,total:data.total_count||0,items:data.total_items||0});
      })
      .catch(()=>add('Не удалось загрузить историю','err'))
      .finally(()=>setLoading(false));
  },[]);

  const STATS=[
    {label:'Файлов сегодня',value:String(stats.today),tone:'acc'},
    {label:'Всего документов',value:String(stats.total),tone:'ok'},
    {label:'Позиций распознано',value:stats.items.toLocaleString('ru-RU'),tone:'warn'},
  ];

  const handleLogout=async()=>{
    await fetch('/api/logout',{method:'POST'});
    onLogout&&onLogout();
    setPage('landing');
  };

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg)'}}>
      <aside style={{width:220,flexShrink:0,background:'var(--sb)',display:'flex',flexDirection:'column',
        borderRight:'1px solid oklch(1 0 0 / 0.06)'}}>
        <div style={{padding:'20px 18px 16px',borderBottom:'1px solid oklch(1 0 0 / 0.07)'}}>
          <Logo light onClick={()=>setPage('landing')}/>
        </div>
        <nav style={{flex:1,padding:'10px 8px',display:'flex',flexDirection:'column',gap:2}}>
          {[
            {id:'app',icon:<IcoScan/>,label:'Распознавание'},
            {id:'cabinet',icon:<IcoHistory/>,label:'История файлов',active:true},
          ].map((n,i)=>(
            <button key={i} onClick={()=>setPage(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:9,
              padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',textAlign:'left',
              background:n.active?'oklch(0.68 0.14 185 / 0.15)':'transparent',
              color:n.active?'var(--acc)':'oklch(1 0 0 / 0.5)',
              fontWeight:n.active?700:500,fontSize:13.5,transition:'all .15s'}}
              onMouseEnter={e=>{if(!n.active)e.currentTarget.style.background='oklch(1 0 0 / 0.06)';}}
              onMouseLeave={e=>{if(!n.active)e.currentTarget.style.background='transparent';}}>
              <span style={{flexShrink:0}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{padding:'12px 16px',borderTop:'1px solid oklch(1 0 0 / 0.07)'}}>
          <button onClick={handleLogout} style={{width:'100%',display:'flex',alignItems:'center',gap:8,
            padding:'8px 12px',borderRadius:8,border:'none',cursor:'pointer',
            background:'transparent',color:'oklch(1 0 0 / 0.35)',fontSize:12,transition:'all .15s'}}
            onMouseEnter={e=>e.currentTarget.style.color='oklch(1 0 0 / 0.7)'}
            onMouseLeave={e=>e.currentTarget.style.color='oklch(1 0 0 / 0.35)'}>
            <IcoLogout/> Выйти
          </button>
        </div>
      </aside>

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{height:54,padding:'0 24px',background:'var(--card)',borderBottom:'1px solid var(--bdr)',
          display:'flex',alignItems:'center',gap:12,flexShrink:0,boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
          <div style={{width:28,height:28,borderRadius:7,background:'var(--accl)',color:'var(--acc)',
            display:'flex',alignItems:'center',justifyContent:'center'}}><IcoHistory/></div>
          <div style={{fontSize:13,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif"}}>История обработок</div>
          <div style={{marginLeft:'auto'}}>
            <button onClick={()=>setPage('app')} style={{background:'var(--acc)',color:'#fff',border:'none',
              cursor:'pointer',fontSize:12,fontWeight:700,padding:'7px 14px',borderRadius:7,
              display:'flex',alignItems:'center',gap:6,boxShadow:`0 2px 10px oklch(0.68 0.14 185 / 0.3)`}}>
              <IcoScan/> Новая накладная
            </button>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:24}}>
          <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14}}>
              {STATS.map((s,i)=>{
                const colors={acc:'var(--acc)',ok:'var(--ok)',warn:'var(--warn)'};
                return(
                  <div key={i} style={{background:'var(--card)',borderRadius:12,padding:'16px 18px',
                    boxShadow:'var(--sh)',border:'1px solid var(--bdr)'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',
                      letterSpacing:'.07em',marginBottom:8}}>{s.label}</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,
                      color:colors[s.tone],letterSpacing:'-.02em',lineHeight:1}}>{s.value}</div>
                  </div>
                );
              })}
            </div>

            <div style={{background:'var(--card)',borderRadius:14,boxShadow:'var(--sh)',border:'1px solid var(--bdr)',overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid var(--bdr)',
                display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:14,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif"}}>
                  История файлов
                </div>
              </div>

              {loading&&(
                <div style={{padding:'3rem',textAlign:'center',color:'var(--t3)',fontSize:13}}>Загрузка…</div>
              )}

              {!loading&&history.length===0&&(
                <div style={{padding:'3rem',textAlign:'center',color:'var(--t3)',fontSize:13}}>
                  Пока нет обработанных накладных
                </div>
              )}

              {!loading&&history.length>0&&(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead>
                      <tr style={{background:'oklch(0.97 0.005 200)'}}>
                        {['Документ','Поставщик','Позиций','Сумма','Дата',''].map(h=>(
                          <th key={h} style={{padding:'9px 14px',textAlign:'left',borderBottom:'1px solid var(--bdr)',
                            color:'var(--t3)',fontSize:10,fontWeight:700,textTransform:'uppercase',
                            letterSpacing:'.06em',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h,i)=>(
                        <tr key={i}
                          onMouseEnter={e=>e.currentTarget.style.background='oklch(0.98 0.004 200)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'11px 14px',borderBottom:'1px solid var(--bdr)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:28,height:28,borderRadius:7,background:'var(--accl)',color:'var(--acc)',
                                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <IcoFile/>
                              </div>
                              <span style={{fontSize:13,fontWeight:500,color:'var(--t1)',
                                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:200}}>
                                {h.doc}
                              </span>
                            </div>
                          </td>
                          <td style={{padding:'11px 14px',borderBottom:'1px solid var(--bdr)',color:'var(--t2)'}}>{h.supplier}</td>
                          <td style={{padding:'11px 14px',borderBottom:'1px solid var(--bdr)',fontWeight:600,color:'var(--t1)'}}>{h.items}</td>
                          <td style={{padding:'11px 14px',borderBottom:'1px solid var(--bdr)',color:'var(--acc)',fontWeight:600,whiteSpace:'nowrap'}}>{money(h.total||0)}</td>
                          <td style={{padding:'11px 14px',borderBottom:'1px solid var(--bdr)',color:'var(--t3)',whiteSpace:'nowrap'}}>{h.date} {h.time}</td>
                          <td style={{padding:'11px 14px',borderBottom:'1px solid var(--bdr)'}}>
                            <Badge tone="ok">Готово</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      {toastEl}
    </div>
  );
}

Object.assign(window,{CabinetPage});
