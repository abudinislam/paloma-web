// settings.jsx — column mapping per integration
function SettingsPage({setPage,onLogout}){
  const {add,el:toastEl}=useToast();
  const [activeInt,setActiveInt]=useState('paloma');

  const INTEGRATIONS=[
    {id:'paloma',label:'Paloma 365',color:'#4f46e5',letter:'P'},
    {id:'csv',label:'CSV',color:'var(--ok)',letter:'C'},
    {id:'1c',label:'1С:Предприятие',color:'#e8501a',letter:'1С'},
    {id:'myskld',label:'МойСклад',color:'#10a37f',letter:'МС'},
  ];

  const SOURCE_FIELDS=['name','article','unit','qty','price','total','vat','barcode','brand','country'];

  const DEFAULT_MAPS={
    paloma:{name:'Наименование товара',article:'Артикул',unit:'Единица измерения',qty:'Количество',price:'Цена',total:'Сумма',vat:'НДС %',barcode:'Штрихкод',brand:'Бренд',country:'Страна'},
    csv:{name:'name',article:'article',unit:'unit',qty:'quantity',price:'price',total:'total',vat:'vat',barcode:'barcode',brand:'brand',country:'country'},
    '1c':{name:'Наименование',article:'Артикул',unit:'ЕдИзм',qty:'Количество',price:'Цена',total:'СуммаРуб',vat:'СтавкаНДС',barcode:'',brand:'',country:'СтранаПроисхождения'},
    myskld:{name:'Наименование',article:'Код',unit:'Единица',qty:'Количество',price:'Цена закупки',total:'',vat:'НДС',barcode:'Штрихкод',brand:'',country:''},
  };

  const LABELS={
    name:'Наименование',article:'Артикул',unit:'Единица',qty:'Количество',
    price:'Цена',total:'Сумма',vat:'НДС',barcode:'Штрихкод',brand:'Бренд',country:'Страна'
  };

  const [maps,setMaps]=useState(DEFAULT_MAPS);
  const cur=maps[activeInt]||{};
  const upd=(field,val)=>setMaps(m=>({...m,[activeInt]:{...m[activeInt],[field]:val}}));

  const [apiKey]=useState('sk-scanly-••••••••••••••••••••2f9a');
  const [webhook,setWebhook]=useState('');

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
            {id:'settings',icon:<IcoCog/>,label:'Настройки',active:true},
          ].map((n,i)=>(
            <button key={i} onClick={()=>setPage(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:9,
              padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',textAlign:'left',
              background:n.active?'oklch(0.68 0.14 185 / 0.15)':'transparent',
              color:n.active?'var(--acc)':'oklch(1 0 0 / 0.5)',
              fontWeight:n.active?700:500,fontSize:13.5,transition:'all .15s'}}
              onMouseEnter={e=>{if(!n.active)e.currentTarget.style.background='oklch(1 0 0 / 0.06)';}}
              onMouseLeave={e=>{if(!n.active)e.currentTarget.style.background='transparent';}}>
              <span style={{flexShrink:0}}>{n.icon}</span> {n.label}
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
            display:'flex',alignItems:'center',justifyContent:'center'}}><IcoCog/></div>
          <div style={{fontSize:13,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif"}}>Настройки</div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:24}}>
          <div style={{maxWidth:860,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>

            <div style={{background:'var(--card)',borderRadius:14,boxShadow:'var(--sh)',border:'1px solid var(--bdr)',overflow:'hidden'}}>
              <div style={{padding:'18px 20px',borderBottom:'1px solid var(--bdr)'}}>
                <div style={{fontSize:15,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif",marginBottom:2}}>
                  Маппинг полей
                </div>
                <div style={{fontSize:12,color:'var(--t2)'}}>Сопоставление распознанных полей с колонками целевой системы</div>
              </div>

              <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--bdr)',padding:'0 20px'}}>
                {INTEGRATIONS.map(ig=>(
                  <button key={ig.id} onClick={()=>setActiveInt(ig.id)}
                    style={{padding:'11px 16px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                      color:activeInt===ig.id?'var(--acc)':'var(--t2)',
                      borderBottom:`2px solid ${activeInt===ig.id?'var(--acc)':'transparent'}`,
                      transition:'all .15s',display:'flex',alignItems:'center',gap:7}}>
                    <span style={{width:16,height:16,borderRadius:4,background:ig.color,
                      color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:8,fontWeight:800}}>{ig.letter}</span>
                    {ig.label}
                  </button>
                ))}
              </div>

              <div style={{padding:20}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 24px 1fr',gap:'10px 12px',alignItems:'center'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>Поле ScanlyAI</div>
                  <div></div>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.07em'}}>
                    Колонка в {INTEGRATIONS.find(i=>i.id===activeInt)?.label}
                  </div>
                  {SOURCE_FIELDS.map(field=>(
                    <React.Fragment key={field}>
                      <div style={{padding:'7px 10px',borderRadius:7,background:'oklch(0.97 0.005 200)',
                        border:'1px solid var(--bdr)',fontSize:13,color:'var(--t1)',fontWeight:500,
                        fontFamily:'monospace',display:'flex',alignItems:'center',gap:6}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:'var(--acc)',flexShrink:0}}></span>
                        {LABELS[field]}
                      </div>
                      <div style={{textAlign:'center',color:'var(--t3)',fontSize:12}}>→</div>
                      <input value={cur[field]||''} onChange={e=>upd(field,e.target.value)}
                        placeholder="(не экспортировать)"
                        style={{padding:'7px 10px',borderRadius:7,border:'1.5px solid var(--bdr)',
                          background:'var(--card)',color:'var(--t1)',fontSize:13,outline:'none',fontFamily:'inherit',
                          transition:'border-color .15s'}}
                        onFocus={e=>e.target.style.borderColor='var(--acc)'}
                        onBlur={e=>e.target.style.borderColor='var(--bdr)'}/>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
                  <button onClick={()=>setMaps(m=>({...m,[activeInt]:DEFAULT_MAPS[activeInt]}))}
                    style={{background:'none',border:'1.5px solid var(--bdr)',cursor:'pointer',
                      fontSize:13,fontWeight:600,color:'var(--t2)',padding:'8px 16px',borderRadius:8}}>
                    Сбросить
                  </button>
                  <button onClick={()=>add('Маппинг сохранён','ok')}
                    style={{background:'var(--acc)',color:'#fff',border:'none',cursor:'pointer',
                      fontSize:13,fontWeight:700,padding:'8px 20px',borderRadius:8,
                      display:'flex',alignItems:'center',gap:6,boxShadow:`0 3px 12px oklch(0.68 0.14 185 / 0.3)`}}>
                    <IcoCheck/> Сохранить
                  </button>
                </div>
              </div>
            </div>

            <div style={{background:'var(--card)',borderRadius:14,boxShadow:'var(--sh)',border:'1px solid var(--bdr)',padding:20}}>
              <div style={{fontSize:15,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif",marginBottom:3}}>API доступ</div>
              <div style={{fontSize:12,color:'var(--t2)',marginBottom:16}}>REST API для интеграции в ваши системы (тариф Бизнес)</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--t2)',marginBottom:5}}>API ключ</div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input value={apiKey} readOnly
                      style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1.5px solid var(--bdr)',
                        background:'oklch(0.97 0.005 200)',color:'var(--t2)',fontSize:13,fontFamily:'monospace',outline:'none'}}/>
                    <button onClick={()=>{navigator.clipboard?.writeText(apiKey);add('Ключ скопирован','ok');}}
                      style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--bdr)',
                        background:'none',color:'var(--t2)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                      Копировать
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--t2)',marginBottom:5}}>Webhook URL</div>
                  <input value={webhook} onChange={e=>setWebhook(e.target.value)}
                    placeholder="https://your-system.kz/webhook/scanly"
                    style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid var(--bdr)',
                      background:'var(--card)',color:'var(--t1)',fontSize:13,outline:'none',fontFamily:'inherit',
                      transition:'border-color .15s',boxSizing:'border-box'}}
                    onFocus={e=>e.target.style.borderColor='var(--acc)'}
                    onBlur={e=>e.target.style.borderColor='var(--bdr)'}/>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      {toastEl}
    </div>
  );
}

Object.assign(window,{SettingsPage});
