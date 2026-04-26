// landing.jsx
function LandingPage({setPage}){
  const FEATURES=[
    {icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="16" height="16" rx="2"/><path d="M3 9h16M9 21V9"/></svg>,
      title:'Авторараспознавание',desc:'PDF, JPG, PNG, скан — любой формат накладной распознаётся автоматически'},
    {icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="18" height="16" rx="1.5"/><line x1="2" y1="8" x2="20" y2="8"/><line x1="7" y1="8" x2="7" y2="19"/><line x1="13" y1="8" x2="13" y2="19"/></svg>,
      title:'Paloma 365',desc:'Два шаблона: «Добавление товара» и «Поступление товара» — готовый Excel без настройки'},
    {icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2"/><circle cx="18" cy="17" r="2"/><circle cx="4" cy="11" r="2"/><line x1="6" y1="11" x2="16" y2="6"/><line x1="6" y1="11" x2="16" y2="16"/></svg>,
      title:'Экспорт',desc:'Paloma 365 Excel или универсальный CSV — выберите нужный формат'},
    {icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/></svg>,
      title:'Ручная правка',desc:'Каждое поле редактируется прямо в браузере до скачивания'},
  ];

  const STEPS=[
    {n:'01',title:'Загрузите файл',desc:'Перетащите накладную или выберите из файлов. PDF, фото, скан.'},
    {n:'02',title:'Проверьте позиции',desc:'Сервис извлекает все товарные строки. Отредактируйте, если нужно.'},
    {n:'03',title:'Скачайте',desc:'Выберите формат: Paloma 365 Excel или CSV.'},
  ];

  const INTEGRATIONS=[
    {name:'Paloma 365',color:'#4f46e5',letter:'P',desc:'Excel-шаблон для импорта',soon:false},
    {name:'Excel / CSV',color:'#0d7a4e',letter:'✓',desc:'Универсальный формат',soon:false},
    {name:'1С:Предприятие',color:'#e8501a',letter:'1С',desc:'Скоро · В разработке',soon:true},
    {name:'МойСклад',color:'#10a37f',letter:'МС',desc:'Скоро · В разработке',soon:true},
  ];

  const rows=[
    {name:'Куртка зимняя',art:'KT-01',qty:20,price:'9 200'},
    {name:'Джинсы Slim',art:'JN-45',qty:30,price:'4 500'},
    {name:'Футболка базовая',art:'FT-12',qty:50,price:'1 200'},
  ];

  const [scanStep,setScanStep]=useState(0);
  useEffect(()=>{
    const t=setTimeout(()=>setScanStep(s=>(s+1)%4),1800);
    return()=>clearTimeout(t);
  },[scanStep]);

  return(
    <div style={{background:'var(--bg)',minHeight:'100vh'}}>
      {/* NAV */}
      <nav style={{background:'var(--card)',borderBottom:'1px solid var(--bdr)',
        position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 8px rgba(0,0,0,.06)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 28px',height:60,
          display:'flex',alignItems:'center',gap:24}}>
          <Logo onClick={()=>setPage('landing')}/>
          <div style={{flex:1}}></div>
          <button onClick={()=>setPage('auth')} style={{background:'none',border:'none',cursor:'pointer',
            fontSize:13,fontWeight:600,color:'var(--t2)',padding:'6px 12px',borderRadius:7,transition:'color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.color='var(--t1)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--t2)'}>
            Войти
          </button>
          <button onClick={()=>setPage('auth')} style={{background:'var(--acc)',color:'#fff',border:'none',cursor:'pointer',
            fontSize:13,fontWeight:700,padding:'8px 18px',borderRadius:8,letterSpacing:'-.01em',
            transition:'background .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--accd)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--acc)'}>
            Попробовать бесплатно →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{background:`linear-gradient(160deg, var(--card) 0%, oklch(0.95 0.04 185 / 0.25) 100%)`,
        borderBottom:'1px solid var(--bdr)',padding:'72px 28px 64px',textAlign:'center'}}>
        <div style={{maxWidth:700,margin:'0 auto'}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(36px,5vw,58px)',fontWeight:800,
            color:'var(--t1)',letterSpacing:'-.035em',lineHeight:1.08,marginBottom:20}}>
            Накладные →<br/>
            <span style={{color:'var(--acc)'}}>в таблицу.</span>{' '}
            <span style={{color:'var(--t3)',fontWeight:700}}>За секунду.</span>
          </h1>
          <p style={{fontSize:18,color:'var(--t2)',lineHeight:1.6,marginBottom:36,maxWidth:520,margin:'0 auto 36px'}}>
            Загрузите любую накладную — PDF, фото, скан. ИИ распознает позиции
            и отдаст готовый файл для Paloma&nbsp;365, 1С или МойСклад.
          </p>
          <button onClick={()=>setPage('auth')} style={{background:'var(--acc)',color:'#fff',border:'none',cursor:'pointer',
            fontSize:15,fontWeight:700,padding:'13px 28px',borderRadius:10,letterSpacing:'-.01em',
            display:'inline-flex',alignItems:'center',gap:8,boxShadow:`0 4px 20px oklch(0.68 0.14 185 / 0.35)`}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--accd)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--acc)'}>
            <IcoScan/> Загрузить накладную
          </button>
        </div>

        {/* Hero visual */}
        <div style={{maxWidth:600,margin:'52px auto 0',display:'flex',gap:20,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
          {/* Source doc */}
          <div style={{width:190,background:'#fff',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.12)',
            border:'1px solid var(--bdr)',padding:'16px 14px',position:'relative',overflow:'hidden',flexShrink:0}}>
            <div style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>накладная.pdf</div>
            {[75,60,90,45,70,55].map((w,i)=>(
              <div key={i} style={{height:5,borderRadius:3,background:i===0?'var(--acc)':'var(--bdr)',width:w+'%',marginBottom:6,opacity:i===0?1:.8}}></div>
            ))}
            {scanStep<3&&<div style={{position:'absolute',left:0,right:0,height:2,
              background:'linear-gradient(90deg,transparent,var(--acc),transparent)',
              top:`${15+scanStep*22}%`,transition:'top .6s ease'}}></div>}
          </div>

          {/* Arrow */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'var(--accl)',color:'var(--acc)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <IcoArrow/>
            </div>
            <div style={{fontSize:9,fontWeight:700,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'.06em'}}>AI OCR</div>
          </div>

          {/* Result table */}
          <div style={{background:'#fff',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.12)',
            border:'1px solid var(--bdr)',overflow:'hidden',flexShrink:0,minWidth:220}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bdr)',
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:9,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em'}}>
                Распознано · {rows.length} позиции
              </span>
              <Badge tone="ok">✓ готово</Badge>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'oklch(0.97 0.005 200)'}}>
                  {['Наименование','Арт.','Кол','Цена'].map(h=>(
                    <th key={h} style={{padding:'5px 8px',textAlign:'left',color:'var(--t3)',fontWeight:700,
                      fontSize:8,textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid var(--bdr)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td style={{padding:'6px 8px',borderBottom:'1px solid var(--bdr)',color:'var(--t1)',fontWeight:500}}>{r.name}</td>
                    <td style={{padding:'6px 8px',borderBottom:'1px solid var(--bdr)',color:'var(--t3)',fontFamily:'monospace',fontSize:10}}>{r.art}</td>
                    <td style={{padding:'6px 8px',borderBottom:'1px solid var(--bdr)',color:'var(--t1)'}}>{r.qty}</td>
                    <td style={{padding:'6px 8px',borderBottom:'1px solid var(--bdr)',color:'var(--acc)',fontWeight:700}}>{r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:'8px 14px'}}>
              <button onClick={()=>setPage('auth')} style={{width:'100%',background:'var(--acc)',color:'#fff',border:'none',
                borderRadius:7,padding:'7px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                Скачать Paloma 365
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'64px 28px 0'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Возможности</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:'var(--t1)',letterSpacing:'-.025em'}}>Всё что нужно для работы с накладными</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20}}>
          {FEATURES.map((f,i)=>(
            <div key={i} style={{background:'var(--card)',borderRadius:14,padding:'24px 22px',
              boxShadow:'var(--sh)',border:'1px solid var(--bdr)',transition:'box-shadow .2s,transform .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='var(--shm)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='var(--sh)';e.currentTarget.style.transform='none';}}>
              <div style={{width:44,height:44,borderRadius:11,background:'var(--accl)',color:'var(--acc)',
                display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>{f.icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:'var(--t1)',marginBottom:6}}>{f.title}</div>
              <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'64px 28px 0'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Как это работает</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:'var(--t1)',letterSpacing:'-.025em'}}>Три шага</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:0}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{padding:'24px 28px',textAlign:'center'}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:48,fontWeight:800,
                color:'oklch(0.68 0.14 185 / 0.12)',letterSpacing:'-.04em',lineHeight:1,marginBottom:12}}>{s.n}</div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--t1)',marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.5}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INTEGRATIONS */}
      <div style={{maxWidth:1100,margin:'0 auto',padding:'64px 28px 0'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Интеграции</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:'var(--t1)',letterSpacing:'-.025em'}}>Экспорт в любую систему</h2>
        </div>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'center'}}>
          {INTEGRATIONS.map((ig,i)=>(
            <div key={i} style={{background:'var(--card)',borderRadius:14,padding:'22px 26px',
              boxShadow:'var(--sh)',border:'1px solid var(--bdr)',
              display:'flex',alignItems:'center',gap:14,minWidth:190,
              opacity:ig.soon?0.6:1,position:'relative',overflow:'hidden'}}>
              {ig.soon&&<div style={{position:'absolute',top:8,right:10,fontSize:9,fontWeight:800,
                color:'var(--warn)',textTransform:'uppercase',letterSpacing:'.06em',
                background:'var(--warnl)',padding:'2px 7px',borderRadius:99}}>Скоро</div>}
              <div style={{width:40,height:40,borderRadius:10,background:ig.soon?'var(--bdr)':ig.color,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:ig.soon?'var(--t3)':'#fff',fontWeight:800,fontSize:13,fontFamily:"'Syne',sans-serif",flexShrink:0}}>
                {ig.letter}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:ig.soon?'var(--t2)':'var(--t1)'}}>{ig.name}</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>{ig.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{marginTop:80,borderTop:'1px solid var(--bdr)',padding:'32px 28px',textAlign:'center'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
          <Logo/>
          <div style={{fontSize:12,color:'var(--t3)'}}>© 2026 ScanlyAI. Казахстан.</div>
          <div style={{display:'flex',gap:20}}>
            {['Политика','Условия','Поддержка'].map(l=>(
              <a key={l} href="#" style={{fontSize:12,color:'var(--t3)',textDecoration:'none'}}
                onMouseEnter={e=>e.currentTarget.style.color='var(--acc)'}
                onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window,{LandingPage});
