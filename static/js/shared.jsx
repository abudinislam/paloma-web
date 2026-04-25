// shared.jsx — icons, logo, toast, utils
const {useState,useEffect,useRef,useCallback,useMemo}=React;

/* —— ICONS —— */
const IcoUpload=()=><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 14V4M7 8l4-4 4 4"/><path d="M3 15v1.5A2.5 2.5 0 005.5 19h11a2.5 2.5 0 002.5-2.5V15"/></svg>;
const IcoFile=()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1z"/><polyline points="9,1 9,6 14,6"/></svg>;
const IcoDownload=()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v8M5 7l3 3 3-3"/><path d="M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/></svg>;
const IcoCheck=()=><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,7 5,10 11,3"/></svg>;
const IcoX=()=><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg>;
const IcoEdit=()=><svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2l2 2-7 7H2v-2L9 2z"/></svg>;
const IcoScan=()=><svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7V4a1 1 0 011-1h3M15 3h3a1 1 0 011 1v3M20 15v3a1 1 0 01-1 1h-3M7 19H4a1 1 0 01-1-1v-3"/><line x1="2" y1="11" x2="20" y2="11" strokeDasharray="3 2"/></svg>;
const IcoCog=()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>;
const IcoUser=()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5.5" r="2.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>;
const IcoLogout=()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M6 8h8"/></svg>;
const IcoHistory=()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,8 3,6 5,8"/><path d="M3 6a6 6 0 104.5-2.1"/><line x1="8" y1="5" x2="8" y2="8.5"/><line x1="8" y1="8.5" x2="10" y2="8.5"/></svg>;
const IcoArrow=()=><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="7" x2="12" y2="7"/><polyline points="8,3 12,7 8,11"/></svg>;
const IcoPlus=()=><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/></svg>;
const IcoChevron=({dir='down'})=><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:dir==='up'?'rotate(180deg)':dir==='left'?'rotate(90deg)':dir==='right'?'rotate(-90deg)':'none'}}><polyline points="2,4 6,8 10,4"/></svg>;

/* —— LOGO —— */
function Logo({onClick,light}){
  const c=light?'#fff':'var(--t1)';
  return(
    <button onClick={onClick} style={{background:'none',border:'none',cursor:onClick?'pointer':'default',
      display:'flex',alignItems:'center',gap:10,padding:0}}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="var(--acc)"/>
        <line x1="6" y1="9" x2="22" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <line x1="6" y1="14" x2="22" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="6" y1="19" x2="16" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </svg>
      <div style={{lineHeight:1}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:c,letterSpacing:'-.02em'}}>scanly</span>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:'var(--acc)',letterSpacing:'-.02em'}}>ai</span>
      </div>
    </button>
  );
}

/* —— TOAST —— */
function useToast(){
  const [items,setItems]=useState([]);
  const ref=useRef(0);
  const add=useCallback((msg,tone='ok')=>{
    const id=++ref.current;
    setItems(t=>[...t,{id,msg,tone}]);
    setTimeout(()=>setItems(t=>t.filter(x=>x.id!==id)),3500);
  },[]);
  const el=(
    <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',zIndex:9999,
      display:'flex',flexDirection:'column',gap:8,alignItems:'center',pointerEvents:'none'}}>
      {items.map(t=>(
        <div key={t.id} style={{padding:'10px 20px',borderRadius:9,fontWeight:600,fontSize:13,color:'#fff',
          background:t.tone==='ok'?'var(--ok)':t.tone==='err'?'var(--err)':'var(--acc)',
          boxShadow:'0 6px 24px rgba(0,0,0,.22)',animation:'sl .22s ease',whiteSpace:'nowrap'}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
  return{add,el};
}

/* —— EDITABLE CELL —— */
function ECell({val,onSave,num,mono}){
  const [edit,setEdit]=useState(false);
  const [v,setV]=useState(val);
  useEffect(()=>{setV(val);},[val]);
  const commit=()=>{setEdit(false);if(String(v)!==String(val))onSave(v);};
  if(edit)return <input autoFocus value={v} onChange={e=>setV(e.target.value)}
    onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape'){setV(val);setEdit(false);}}}
    style={{width:num?72:170,padding:'3px 7px',borderRadius:6,border:'1.5px solid var(--acc)',
      background:'var(--accl)',color:'var(--t1)',fontSize:13,fontFamily:mono?'monospace':'inherit',outline:'none'}}/>;
  return(
    <span onClick={()=>setEdit(true)} title="Нажмите для редактирования"
      style={{cursor:'text',display:'inline-flex',alignItems:'center',gap:3,
        padding:'2px 5px',borderRadius:5,transition:'background .12s',fontFamily:mono?'monospace':'inherit'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--accl)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      {val}<span style={{opacity:0,color:'var(--acc)',fontSize:10}}
        onMouseEnter={e=>e.currentTarget.style.opacity=1}><IcoEdit/></span>
    </span>
  );
}

/* —— BADGE —— */
function Badge({children,tone='acc'}){
  const map={acc:['var(--accl)','var(--acc)'],ok:['var(--okl)','var(--ok)'],
    warn:['var(--warnl)','var(--warn)'],err:['var(--errl)','var(--err)'],gray:['var(--bdr)','var(--t2)']};
  const [bg,c]=map[tone]||map.acc;
  return<span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:6,
    fontSize:11,fontWeight:700,letterSpacing:'.02em',whiteSpace:'nowrap',background:bg,color:c}}>{children}</span>;
}

const money=n=>Number(n).toLocaleString('ru-RU')+' ₸';

Object.assign(window,{
  IcoUpload,IcoFile,IcoDownload,IcoCheck,IcoX,IcoEdit,IcoScan,IcoCog,IcoUser,IcoLogout,
  IcoHistory,IcoArrow,IcoPlus,IcoChevron,
  Logo,useToast,ECell,Badge,money
});
