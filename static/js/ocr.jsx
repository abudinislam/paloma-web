// ocr.jsx — main scanner page
const MOCK_ROWS=[
  {id:1,name:'Куртка зимняя Slim',article:'KT-319',unit:'шт',qty:10,price:9200,total:92000,vat:12,checked:true},
  {id:2,name:'Джинсы Slim Fit синие',article:'JN-045',unit:'шт',qty:30,price:4500,total:135000,vat:12,checked:true},
  {id:3,name:'Футболка Premium белая',article:'FT-001',unit:'шт',qty:50,price:1200,total:60000,vat:12,checked:true},
  {id:4,name:'Толстовка Hoodie серая',article:'TS-102',unit:'шт',qty:20,price:2800,total:56000,vat:12,checked:true},
  {id:5,name:'Кроссовки Air Classic',article:'KR-220',unit:'пар',qty:15,price:8900,total:133500,vat:12,checked:true},
];

/* —— DOWNLOAD HELPERS —— */
async function downloadPaloma(rows,supplier){
  const items=rows.filter(r=>r.checked).map(r=>({
    название:r.name, артикул:r.article, единица:r.unit,
    количество:r.qty, цена:r.price, сумма:r.total,
  }));
  const res=await fetch('/api/download',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({items,supplier:supplier||''})
  });
  if(!res.ok)throw new Error('Ошибка скачивания');
  const blob=await res.blob();
  const cd=res.headers.get('Content-Disposition')||'';
  const name=(cd.match(/filename=(.+)/)||[])[1]||'paloma_export.xlsx';
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:name});
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

async function downloadCSV(rows,supplier,date,number){
  const res=await fetch('/api/download/csv',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      items:rows.filter(r=>r.checked).map(r=>({
        название:r.name,артикул:r.article,единица:r.unit,
        количество:r.qty,цена:r.price,сумма:r.total,
      })),
      supplier:supplier||'',date:date||'',number:number||''
    })
  });
  if(!res.ok)throw new Error('Ошибка скачивания');
  const blob=await res.blob();
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'накладная.csv'});
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}

/* —— UPLOAD ZONE —— */
function UploadZone({onUpload,disabled}){
  const [drag,setDrag]=useState(false);
  const ref=useRef();
  const handle=files=>{if(!disabled&&files&&files.length>0)onUpload(files[0]);};
  return(
    <div onDragOver={e=>{if(!disabled){e.preventDefault();setDrag(true);}}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files);}}
      onClick={()=>!disabled&&ref.current.click()}
      style={{border:`2px dashed ${drag?'var(--acc)':'var(--bdr)'}`,borderRadius:16,
        opacity:disabled?.5:1,cursor:disabled?'not-allowed':'pointer',
        background:drag?'var(--accl)':'oklch(0.98 0.004 200)',
        padding:'56px 32px',textAlign:'center',transition:'all .2s'}}>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}}
        onChange={e=>handle(e.target.files)}/>
      <div style={{width:60,height:60,borderRadius:16,background:drag?'var(--acc)':'var(--accl)',
        color:drag?'#fff':'var(--acc)',display:'flex',alignItems:'center',justifyContent:'center',
        margin:'0 auto 18px',transition:'all .2s'}}>
        <IcoUpload/>
      </div>
      <div style={{fontSize:16,fontWeight:700,color:'var(--t1)',marginBottom:6}}>Загрузить накладную</div>
      <div style={{fontSize:13,color:'var(--t2)',marginBottom:18}}>Перетащите файл или нажмите для выбора</div>
      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
        {['PDF','JPG','PNG','Скан'].map(f=>(
          <span key={f} style={{padding:'3px 10px',borderRadius:6,background:'var(--bdr)',
            color:'var(--t2)',fontSize:11,fontWeight:700}}>{f}</span>
        ))}
      </div>
    </div>
  );
}

/* —— SCANNING VIEW —— */
function ScanningView({filename}){
  const steps=['Загрузка файла…','Анализ структуры…','Извлечение позиций…','Проверка данных…'];
  const [step,setStep]=useState(0);
  useEffect(()=>{
    if(step<steps.length-1){const t=setTimeout(()=>setStep(s=>s+1),820);return()=>clearTimeout(t);}
  },[step]);
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 32px',animation:'sl .3s ease'}}>
      <div style={{position:'relative',width:130,height:165,background:'#fff',borderRadius:12,
        boxShadow:'0 8px 32px oklch(0.62 0.13 185 / 0.2)',marginBottom:36,overflow:'hidden',border:'1px solid var(--bdr)'}}>
        <div style={{padding:'14px 12px 8px'}}>
          {[80,55,90,40,70,50,65,45].map((w,i)=>(
            <div key={i} style={{height:5,borderRadius:3,marginBottom:6,
              background:i===0?'var(--acc)':'var(--bdr)',width:w+'%',opacity:i===0?1:.7}}></div>
          ))}
        </div>
        <div style={{position:'absolute',left:0,right:0,height:2,
          background:'linear-gradient(90deg,transparent,var(--acc),transparent)',
          animation:'scanBeam 1.3s ease-in-out infinite',top:0}}></div>
        <div style={{position:'absolute',left:0,right:0,height:36,
          background:'linear-gradient(180deg,oklch(0.62 0.13 185 / 0.1),transparent)',
          animation:'scanBeam 1.3s ease-in-out infinite',top:0}}></div>
      </div>
      <div style={{fontSize:16,fontWeight:700,color:'var(--t1)',marginBottom:6,fontFamily:"'Syne',sans-serif"}}>
        Распознаём накладную
      </div>
      <div style={{fontSize:13,color:'var(--acc)',fontWeight:600,marginBottom:24}}>{steps[step]}</div>
      <div style={{width:240,height:4,background:'var(--bdr)',borderRadius:4,overflow:'hidden',marginBottom:16}}>
        <div style={{height:'100%',background:'var(--acc)',borderRadius:4,
          width:`${(step+1)/steps.length*100}%`,transition:'width .7s ease'}}></div>
      </div>
      <div style={{fontSize:12,color:'var(--t3)',display:'flex',alignItems:'center',gap:6}}><IcoFile/> {filename}</div>
    </div>
  );
}

/* —— RESULT TABLE —— */
function ResultTable({rows,setRows,format}){
  const toggle=id=>setRows(r=>r.map(x=>x.id===id?{...x,checked:!x.checked}:x));
  const upd=(id,field,val)=>setRows(r=>r.map(x=>{
    if(x.id!==id)return x;
    const n={...x,[field]:field==='qty'||field==='price'?Number(val)||0:val};
    n.total=n.qty*n.price;return n;
  }));
  const all=rows.every(r=>r.checked);
  const some=rows.some(r=>r.checked)&&!all;
  const checked=rows.filter(r=>r.checked);
  const totSum=checked.reduce((s,r)=>s+r.total,0);
  const fmtLabel=format==='paloma_add'?'Paloma 365 — Добавление':format==='paloma_in'?'Paloma 365 — Поступление':'CSV';
  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'var(--ok)',display:'inline-block'}}></span>
          <span style={{fontSize:13,color:'var(--t2)'}}>Распознано <b style={{color:'var(--t1)'}}>{rows.length}</b> позиций</span>
        </div>
        <div style={{width:1,height:12,background:'var(--bdr)'}}></div>
        <span style={{fontSize:13,color:'var(--t2)'}}>Выбрано: <b style={{color:'var(--t1)'}}>{checked.length}</b></span>
        <div style={{width:1,height:12,background:'var(--bdr)'}}></div>
        <span style={{fontSize:13,color:'var(--t2)'}}>Сумма: <b style={{color:'var(--acc)'}}>{money(totSum)}</b></span>
        <div style={{marginLeft:'auto'}}><Badge tone="acc">{fmtLabel}</Badge></div>
      </div>
      <div style={{background:'var(--card)',borderRadius:12,boxShadow:'var(--sh)',overflow:'hidden',border:'1px solid var(--bdr)'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'oklch(0.97 0.005 200)'}}>
                <th style={{padding:'9px 12px',textAlign:'left',borderBottom:'1px solid var(--bdr)',width:36}}>
                  <input type="checkbox" checked={all} ref={el=>{if(el)el.indeterminate=some;}}
                    onChange={()=>setRows(r=>r.map(x=>({...x,checked:!all})))}
                    style={{cursor:'pointer',accentColor:'var(--acc)'}}/>
                </th>
                {['Наименование','Артикул','Ед.','Кол-во','Цена, ₸','Сумма, ₸'].map(h=>(
                  <th key={h} style={{padding:'9px 12px',textAlign:'left',borderBottom:'1px solid var(--bdr)',
                    color:'var(--t2)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
                <th style={{padding:'9px 8px',borderBottom:'1px solid var(--bdr)',width:36}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.id} style={{opacity:r.checked?1:.42,transition:'opacity .15s',animation:`sl .25s ease ${i*.025}s both`}}
                  onMouseEnter={e=>e.currentTarget.style.background='oklch(0.98 0.004 200)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
                    <input type="checkbox" checked={r.checked} onChange={()=>toggle(r.id)} style={{cursor:'pointer',accentColor:'var(--acc)'}}/>
                  </td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}><ECell val={r.name} onSave={v=>upd(r.id,'name',v)}/></td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)',color:'var(--t3)',fontFamily:'monospace',fontSize:12}}><ECell val={r.article} onSave={v=>upd(r.id,'article',v)} mono/></td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)',color:'var(--t2)'}}>{r.unit}</td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}><ECell val={r.qty} onSave={v=>upd(r.id,'qty',v)} num/></td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}><ECell val={r.price} onSave={v=>upd(r.id,'price',v)} num/></td>
                  <td style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)',fontWeight:600,color:'var(--t1)',whiteSpace:'nowrap'}}>{money(r.total)}</td>

                  <td style={{padding:'10px 8px',borderBottom:'1px solid var(--bdr)'}}>
                    <button onClick={()=>setRows(rr=>rr.filter(x=>x.id!==r.id))}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--t3)',padding:'3px',borderRadius:5,display:'flex',alignItems:'center'}}
                      onMouseEnter={e=>e.currentTarget.style.color='var(--err)'}
                      onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}><IcoX/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* —— OCR PAGE —— */
function OcrPage({setPage,onLogout}){
  const {add,el:toastEl}=useToast();
  const [stage,setStage]=useState('upload');
  const [filename,setFilename]=useState('');
  const [supplier,setSupplier]=useState('');
  const [docDate,setDocDate]=useState('');
  const [docNum,setDocNum]=useState('');
  const [format,setFormat]=useState('paloma_add');
  const [rows,setRows]=useState([]);
  const [quota,setQuota]=useState(null);
  const [uploading,setUploading]=useState(false);

  const FORMAT_OPTIONS=[
    {id:'paloma_add',label:'Paloma 365 — Добавление товара'},
    {id:'paloma_in', label:'Paloma 365 — Поступление товара'},
    {id:'csv',       label:'CSV'},
  ];

  useEffect(()=>{
    fetch('/api/quota').then(r=>r.json()).then(setQuota).catch(()=>{});
  },[stage]);

  const handleUpload=f=>{
    if(uploading)return;
    setUploading(true);
    setFilename(f.name);
    setStage('scanning');
    const fd=new FormData();
    fd.append('file',f);
    fetch('/api/parse',{method:'POST',body:fd})
      .then(r=>r.json())
      .then(data=>{
        if(data.ok){
          const pos=data.data.позиции||[];
          const mapped=pos.map((p,i)=>({
            id:i+1,
            name:p.название||p.name||'',
            article:p.артикул||p.article||'',
            unit:p.единица||p.unit||'шт',
            qty:Number(p.количество||p.qty||0),
            price:Number(p.цена||p.price||0),
            total:Number(p.сумма||p.total||0),
            vat:12,
            checked:true,
          }));
          setRows(mapped);
          setSupplier(data.data.поставщик||'');
          setDocDate(data.data.дата||'');
          setDocNum(data.data.номер||'');
          setStage('result');
        } else {
          add(data.error||'Ошибка распознавания','err');
          setStage('upload');
        }
      })
      .catch(()=>{add('Ошибка соединения','err');setStage('upload');})
      .finally(()=>setUploading(false));
  };

  const handleDemo=()=>handleUpload(new File([new Uint8Array(1)],'demo_накладная_Adidas_2026.pdf',{type:'application/pdf'}));

  const handleDownload=async()=>{
    const checked=rows.filter(r=>r.checked);
    if(!checked.length)return;
    try{
      if(format==='csv'){
        await downloadCSV(rows,supplier,docDate,docNum);
      } else {
        await downloadPaloma(rows,supplier);
      }
      add(`Скачано · ${FORMAT_OPTIONS.find(f=>f.id===format)?.label}`,'ok');
    } catch(e){
      add(e.message||'Ошибка скачивания','err');
    }
  };

  const handleLogout=async()=>{
    await fetch('/api/logout',{method:'POST'});
    onLogout&&onLogout();
    setPage('landing');
  };

  const checked=rows.filter(r=>r.checked);

  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg)'}}>
      <aside style={{width:220,flexShrink:0,background:'var(--sb)',display:'flex',flexDirection:'column',
        borderRight:'1px solid oklch(1 0 0 / 0.06)'}}>
        <div style={{padding:'20px 18px 16px',borderBottom:'1px solid oklch(1 0 0 / 0.07)'}}>
          <Logo light onClick={()=>setPage('landing')}/>
        </div>
        <nav style={{flex:1,padding:'10px 8px'}}>
          <button style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:'9px 12px',
            borderRadius:8,border:'none',cursor:'pointer',textAlign:'left',
            background:'oklch(0.62 0.13 185 / 0.15)',color:'var(--acc)',fontWeight:700,fontSize:13.5}}>
            <IcoScan/> Распознавание
          </button>
        </nav>
        {quota&&quota.limit&&(
          <div style={{padding:'12px 16px',borderTop:'1px solid oklch(1 0 0 / 0.07)'}}>
            <div style={{fontSize:10,fontWeight:700,color:'oklch(1 0 0 / 0.4)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>
              Лимит в месяц
            </div>
            <div style={{height:4,background:'oklch(1 0 0 / 0.1)',borderRadius:4,overflow:'hidden',marginBottom:5}}>
              <div style={{height:'100%',background:'var(--acc)',borderRadius:4,
                width:`${Math.min(100,(quota.limit-quota.remaining)/quota.limit*100)}%`}}></div>
            </div>
            <div style={{fontSize:11,color:'oklch(1 0 0 / 0.5)'}}>
              {quota.remaining} / {quota.limit} осталось
            </div>
          </div>
        )}
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
            display:'flex',alignItems:'center',justifyContent:'center'}}><IcoScan/></div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif"}}>Распознавание накладных</div>
            {supplier&&<div style={{fontSize:11,color:'var(--t3)'}}>Поставщик: {supplier}</div>}
          </div>
          <div style={{marginLeft:'auto'}}>
            <Badge tone="ok">
              <span style={{width:5,height:5,borderRadius:'50%',background:'var(--ok)',display:'inline-block',marginRight:5}}></span>
              Готов к работе
            </Badge>
          </div>
        </div>

        <div style={{flex:1,overflow:'auto',padding:24}}>
          <div style={{maxWidth:960,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

            {stage==='upload'&&(
              <div style={{background:'var(--card)',borderRadius:14,padding:'18px 20px',
                boxShadow:'var(--sh)',border:'1px solid var(--bdr)'}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Формат экспорта</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {FORMAT_OPTIONS.map(f=>(
                    <label key={f.id} style={{display:'flex',alignItems:'center',gap:7,
                      padding:'8px 14px',borderRadius:8,cursor:'pointer',
                      border:`1.5px solid ${format===f.id?'var(--acc)':'var(--bdr)'}`,
                      background:format===f.id?'var(--accl)':'transparent',transition:'all .15s'}}>
                      <input type="radio" name="fmt" value={f.id} checked={format===f.id}
                        onChange={()=>setFormat(f.id)} style={{accentColor:'var(--acc)',flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:format===f.id?700:500,
                        color:format===f.id?'var(--acc)':'var(--t1)',whiteSpace:'nowrap'}}>{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{background:'var(--card)',borderRadius:14,boxShadow:'var(--sh)',
              border:'1px solid var(--bdr)',overflow:'hidden'}}>
              {stage==='upload'&&(
                <div style={{padding:20}}>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:12}}>
                    Загрузка файла
                  </div>
                  <UploadZone onUpload={handleUpload} disabled={uploading}/>
                  <div style={{textAlign:'center',marginTop:14}}>
                    <button onClick={handleDemo} disabled={uploading}
                      style={{background:'none',border:'1.5px solid var(--bdr)',cursor:uploading?'not-allowed':'pointer',
                        fontSize:12,fontWeight:600,color:'var(--t2)',padding:'7px 16px',borderRadius:8,
                        display:'inline-flex',alignItems:'center',gap:6,transition:'all .15s',opacity:uploading?.4:1}}
                      onMouseEnter={e=>{if(!uploading)e.currentTarget.style.borderColor='var(--acc)';}}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bdr)'}>
                      <IcoFile/> Попробовать демо-файл
                    </button>
                  </div>
                </div>
              )}
              {stage==='scanning'&&<ScanningView filename={filename}/>}
              {stage==='result'&&(
                <div style={{padding:20}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:'var(--t1)',fontFamily:"'Syne',sans-serif",marginBottom:3}}>
                        Результат распознавания
                      </div>
                      <div style={{fontSize:12,color:'var(--t2)',display:'flex',alignItems:'center',gap:6}}>
                        <IcoFile/> {filename}
                        <span style={{color:'var(--bdr)'}}>·</span>
                        <span style={{color:'var(--ok)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                          <IcoCheck/> Успешно
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <button onClick={()=>{setStage('upload');setRows([]);}}
                        style={{background:'none',border:'1.5px solid var(--bdr)',cursor:'pointer',
                          fontSize:12,fontWeight:600,color:'var(--t2)',padding:'7px 14px',borderRadius:8,transition:'border-color .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='var(--acc)'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bdr)'}>
                        Новый файл
                      </button>
                      <button onClick={handleDownload} disabled={checked.length===0}
                        style={{background:'var(--acc)',color:'#fff',border:'none',cursor:'pointer',
                          fontSize:13,fontWeight:700,padding:'8px 18px',borderRadius:8,
                          display:'inline-flex',alignItems:'center',gap:7,opacity:checked.length===0?.4:1,
                          boxShadow:`0 3px 14px oklch(0.62 0.13 185 / 0.3)`,transition:'background .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--accd)'}
                        onMouseLeave={e=>e.currentTarget.style.background='var(--acc)'}>
                        <IcoDownload/> Скачать
                        {checked.length>0&&<span style={{background:'rgba(255,255,255,.25)',borderRadius:99,padding:'0 6px',fontSize:11,fontWeight:700}}>{checked.length}</span>}
                      </button>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderRadius:9,
                    background:'var(--accl)',border:'1px solid oklch(0.62 0.13 185 / 0.18)',marginBottom:16}}>
                    <span style={{color:'var(--acc)',fontSize:12}}>✎</span>
                    <span style={{fontSize:12,color:'var(--accd)',fontWeight:500}}>
                      Нажмите на любое значение — поле откроется для редактирования
                    </span>
                  </div>
                  <ResultTable rows={rows} setRows={setRows} format={format}/>
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

Object.assign(window,{OcrPage,UploadZone,ScanningView});
