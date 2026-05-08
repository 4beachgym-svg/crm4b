import { useState, useMemo, useEffect } from "react";

const ACADEMIAS = ["Rede Completa — 4Beach","4Beach Brooklin","4Beach Bauru","4Beach Hortolândia","4Beach Belém","4Beach Conquista","4Beach Cambuí"];
const ETAPAS = ["Entrada","Abriu Conversa","Agendou Aula","Feedback","Fechamento"];
const ORIGENS = ["Orgânico","Tráfego Pago"];
const MOTIVOS_PERDA = ["Preço","Localização","Sem interesse","Concorrente","Sem resposta","Outro"];
const CORES_ETAPA = ["#7F77DD","#1D9E75","#EF9F27","#378ADD","#D4537E"];
const MAX_TENTATIVAS = 6;
const STORAGE_KEY = "4beach_crm_leads_v2";
const TEMPLATES_KEY = "4beach_crm_templates";
const SESSION_KEY = "4beach_crm_session";

const USUARIOS = [
  {id:0,login:"rogerio",senha:"4beach2026",nome:"Rogério Sthanke",role:"admin",academia:null},
  {id:1,login:"brooklin",senha:"brook2026",nome:"4Beach Brooklin",role:"unidade",academia:1},
  {id:2,login:"bauru",senha:"bauru2026",nome:"4Beach Bauru",role:"unidade",academia:2},
  {id:3,login:"hortolandia",senha:"horto2026",nome:"4Beach Hortolândia",role:"unidade",academia:3},
  {id:4,login:"belem",senha:"belem2026",nome:"4Beach Belém",role:"unidade",academia:4},
  {id:5,login:"conquista",senha:"conq2026",nome:"4Beach Conquista",role:"unidade",academia:5},
  {id:6,login:"cambui",senha:"camb2026",nome:"4Beach Cambuí",role:"unidade",academia:6},
];

const TEMPLATES_DEFAULT = [
  {etapa:0,titulo:"Primeiro contato",mensagem:`Olá, {nome}! Tudo bem?\n\nVi que você estava buscando uma academia e queria me apresentar. Sou da {academia} e estou aqui pra te ajudar nessa caminhada.\n\nCada pessoa tem um ritmo, uma história e um objetivo diferente — e a gente respeita isso. Seja pra cuidar da saúde, ganhar mais disposição ou qualquer outro motivo que te trouxe até aqui, você não vai estar sozinho nesse processo.\n\nMe conta um pouquinho: o que te motivou a buscar uma academia agora?`},
  {etapa:1,titulo:"Após abrir conversa",mensagem:`Oi, {nome}! Que bom falar com você.\n\nFico feliz que você tenha respondido. Queria entender melhor o que você está buscando pra gente pensar juntos no melhor caminho.\n\nVocê já praticou alguma atividade física antes? E hoje, como você está se sentindo em relação ao seu corpo e à sua saúde?\n\nSem pressa, pode me contar à vontade. Estou aqui pra ouvir.`},
  {etapa:2,titulo:"Confirmação da aula experimental",mensagem:`Oi, {nome}! Passando aqui só pra confirmar a sua aula experimental.\n\nEstamos te esperando com muito carinho. É um momento bem tranquilo, sem pressão nenhuma — você vai conhecer o espaço, sentir a energia do lugar e ver como o treino se encaixa na sua rotina.\n\nLembra de vir com roupa confortável e uma garrafinha de água. Qualquer dúvida antes de chegar, pode me chamar aqui.\n\nTudo certo pra você?`},
  {etapa:3,titulo:"Feedback após o treino",mensagem:`Oi, {nome}! Como você está?\n\nQueria saber como foi pra você a experiência aqui na academia. O que achou do ambiente, do treino, de como se sentiu?\n\nSua opinião é muito importante pra gente — tanto o que gostou quanto o que talvez não tenha combinado tanto. Pode falar à vontade, sem filtro mesmo.\n\nComo se sentiu depois do treino?`},
  {etapa:4,titulo:"Fechamento com cuidado",mensagem:`Oi, {nome}! Tudo bem?\n\nQueria entender como você está se sentindo em relação a começar os treinos. Sei que às vezes surgem dúvidas, questões práticas ou até inseguranças — e tudo isso é completamente normal.\n\nEstou aqui pra te ajudar a pensar no que faz mais sentido pra você, sem pressa. Não precisa decidir nada agora — só queria saber se ficou alguma dúvida que eu possa te ajudar a esclarecer.\n\nO que está passando pela sua cabeça?`},
];

function hoje(){ return new Date(new Date().toDateString()); }
function fmtData(d){ return new Date(d).toLocaleDateString("pt-BR"); }

const css = {
  page: {fontFamily:"var(--font-sans)", padding:"1.5rem 1rem", maxWidth:860, margin:"0 auto"},
  card: {background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:10},
  label: {display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:6},
  field: {marginBottom:16},
  inp: {width:"100%", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", padding:"10px 12px", fontSize:13, boxSizing:"border-box", background:"var(--color-background-secondary)", color:"var(--color-text-primary)", display:"block"},
  btn: (v,c) => ({cursor:"pointer", border:v?"none":"0.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 16px", fontSize:13, background:c||(v?"#7F77DD":"var(--color-background-secondary)"), color:v?"#fff":"var(--color-text-primary)", fontWeight:v?500:400, whiteSpace:"nowrap"}),
  badge: (c) => ({background:c+"22", color:c, borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:500, display:"inline-block"}),
  overlay: {position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100},
  modal: {background:"var(--color-background-primary)", borderRadius:16, padding:"1.75rem", width:460, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxSizing:"border-box"},
  modalHeader: {display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, paddingBottom:14, borderBottom:"0.5px solid var(--color-border-tertiary)"},
  closeBtn: {background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--color-text-secondary)", lineHeight:1},
  divider: {borderTop:"0.5px solid var(--color-border-tertiary)", margin:"16px 0"},
  row: {display:"flex", gap:10},
};

export default function CRM(){
  const [usuario,setUsuario]=useState(null);
  const [loginForm,setLoginForm]=useState({login:"",senha:""});
  const [loginErro,setLoginErro]=useState("");
  const [leads,setLeads]=useState([]);
  const [templates,setTemplates]=useState(TEMPLATES_DEFAULT);
  const [carregado,setCarregado]=useState(false);
  const [aba,setAba]=useState("dashboard");
  const [acadFiltro,setAcadFiltro]=useState(0);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [detalhe,setDetalhe]=useState(null);
  const [busca,setBusca]=useState("");
  const [filtroOrigem,setFiltroOrigem]=useState("Todos");
  const [filtroEtapa,setFiltroEtapa]=useState("Todos");
  const [modalFU,setModalFU]=useState(null);
  const [formFU,setFormFU]=useState({data:"",hora:"09:00",tipo:"Ligação",obs:""});
  const [editTpl,setEditTpl]=useState(null);
  const [modalWA,setModalWA]=useState(null);
  const [msgWA,setMsgWA]=useState("");
  const [salvando,setSalvando]=useState(false);
  const [mostrarSenhas,setMostrarSenhas]=useState(false);

  useEffect(()=>{
    async function init(){
      try{ const s=await window.storage.get(SESSION_KEY); if(s?.value) setUsuario(JSON.parse(s.value)); }catch(e){}
      try{ const r=await window.storage.get(STORAGE_KEY); if(r?.value) setLeads(JSON.parse(r.value)); }catch(e){}
      try{ const t=await window.storage.get(TEMPLATES_KEY); if(t?.value) setTemplates(JSON.parse(t.value)); }catch(e){}
      setCarregado(true);
    }
    init();
  },[]);

  useEffect(()=>{
    if(!carregado) return;
    setSalvando(true);
    const t=setTimeout(async()=>{ try{ await window.storage.set(STORAGE_KEY,JSON.stringify(leads)); }catch(e){} setSalvando(false); },800);
    return()=>clearTimeout(t);
  },[leads,carregado]);

  useEffect(()=>{
    if(!carregado) return;
    window.storage.set(TEMPLATES_KEY,JSON.stringify(templates)).catch(()=>{});
  },[templates,carregado]);

  function fazerLogin(){
    const u=USUARIOS.find(u=>u.login===loginForm.login.trim().toLowerCase()&&u.senha===loginForm.senha.trim());
    if(!u){ setLoginErro("Usuário ou senha incorretos."); return; }
    setUsuario(u); setAcadFiltro(u.role==="admin"?0:u.academia);
    window.storage.set(SESSION_KEY,JSON.stringify(u)).catch(()=>{});
  }

  function fazerLogout(){
    setUsuario(null); window.storage.delete(SESSION_KEY).catch(()=>{});
    setLoginForm({login:"",senha:""});
  }

  const leadsVisiveis=useMemo(()=>{
    if(!usuario) return [];
    return usuario.role==="admin"?leads:leads.filter(l=>l.academia===usuario.academia);
  },[leads,usuario]);

  const leadsFiltrados=useMemo(()=>leadsVisiveis.filter(l=>{
    const acadOk=usuario?.role==="admin"?(acadFiltro===0||l.academia===acadFiltro):true;
    const buscaOk=busca===""||l.nome.toLowerCase().includes(busca.toLowerCase())||l.telefone.includes(busca);
    const origemOk=filtroOrigem==="Todos"||l.origem===filtroOrigem;
    const etapaOk=filtroEtapa==="Todos"||ETAPAS[l.etapa]===filtroEtapa;
    return acadOk&&buscaOk&&origemOk&&etapaOk;
  }),[leadsVisiveis,acadFiltro,busca,filtroOrigem,filtroEtapa,usuario]);

  const todosFollowups=useMemo(()=>{
    const lista=[];
    leadsVisiveis.forEach(l=>{
      if(usuario?.role==="admin"&&acadFiltro!==0&&l.academia!==acadFiltro) return;
      (l.followups||[]).forEach(f=>{ if(!f.feito) lista.push({...f,lead:l}); });
    });
    return lista.sort((a,b)=>new Date(a.data.split("/").reverse().join("-"))-new Date(b.data.split("/").reverse().join("-")));
  },[leadsVisiveis,acadFiltro,usuario]);

  const fuAtrasados=todosFollowups.filter(f=>new Date(f.data.split("/").reverse().join("-"))<hoje());
  const fuHoje=todosFollowups.filter(f=>new Date(f.data.split("/").reverse().join("-")).toDateString()===hoje().toDateString());
  const fuFuturos=todosFollowups.filter(f=>new Date(f.data.split("/").reverse().join("-"))>hoje());

  const stats=useMemo(()=>{
    const total=leadsFiltrados.length;
    const organicos=leadsFiltrados.filter(l=>l.origem==="Orgânico").length;
    const pago=leadsFiltrados.filter(l=>l.origem==="Tráfego Pago").length;
    const fechados=leadsFiltrados.filter(l=>l.fechou===true).length;
    const perdidos=leadsFiltrados.filter(l=>l.fechou===false).length;
    const porEtapa=ETAPAS.map((_,i)=>leadsFiltrados.filter(l=>l.etapa===i).length);
    const conv=total>0?((fechados/total)*100).toFixed(1):"0.0";
    const motivosPerda={};
    leadsFiltrados.filter(l=>l.fechou===false&&l.motivoPerda).forEach(l=>{motivosPerda[l.motivoPerda]=(motivosPerda[l.motivoPerda]||0)+1;});
    const porAcademia=ACADEMIAS.slice(1).map((nome,i)=>{
      const al=leadsVisiveis.filter(l=>l.academia===i+1);
      const af=al.filter(l=>l.fechou===true).length;
      return{nome,total:al.length,fechados:af,conv:al.length>0?((af/al.length)*100).toFixed(1):"0.0"};
    });
    return{total,organicos,pago,fechados,perdidos,porEtapa,conv,motivosPerda,porAcademia};
  },[leadsFiltrados,leadsVisiveis]);

  function salvarLead(){
    if(!form.nome?.trim()) return;
    const acad=usuario.role==="unidade"?usuario.academia:form.academia||1;
    if(modal==="novo"){
      setLeads(prev=>[...prev,{...form,academia:acad,id:Date.now(),etapa:parseInt(form.etapa)||0,fechou:null,motivoPerda:"",data:fmtData(hoje()),followups:[]}]);
    } else {
      setLeads(prev=>prev.map(l=>l.id===modal?{...l,...form,academia:acad,etapa:parseInt(form.etapa)||l.etapa}:l));
    }
    setModal(null);
  }

  function abrirNovo(){
    setForm({nome:"",telefone:"",origem:"Orgânico",academia:usuario.role==="unidade"?usuario.academia:1,etapa:0,notas:""});
    setModal("novo");
  }

  function abrirEditar(lead){
    setForm({...lead}); setModal(lead.id); setDetalhe(null);
  }

  function avancarEtapa(lead){
    if(lead.etapa>=4) return;
    setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,etapa:l.etapa+1}:l));
    setDetalhe(prev=>prev?{...prev,etapa:prev.etapa+1}:null);
  }

  function fecharPlano(lead,fechou){
    const motivo=!fechou?(prompt("Motivo da perda:")||"Outro"):"";
    setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,fechou,motivoPerda:motivo}:l));
    setDetalhe(null);
  }

  function salvarFU(){
    if(!formFU.data) return;
    const novoFU={id:Date.now(),...formFU,feito:false,resultado:""};
    setLeads(prev=>prev.map(l=>l.id!==modalFU?l:{...l,followups:[...(l.followups||[]),novoFU]}));
    if(detalhe?.id===modalFU) setDetalhe(prev=>({...prev,followups:[...(prev.followups||[]),novoFU]}));
    setModalFU(null);
  }

  function marcarFeito(leadId,fuId,resultado){
    setLeads(prev=>prev.map(l=>l.id!==leadId?l:{...l,followups:(l.followups||[]).map(f=>f.id===fuId?{...f,feito:true,resultado}:f)}));
    if(detalhe?.id===leadId) setDetalhe(prev=>({...prev,followups:(prev.followups||[]).map(f=>f.id===fuId?{...f,feito:true,resultado}:f)}));
  }

  function abrirWA(lead){
    const tpl=templates[lead.etapa];
    setMsgWA(tpl.mensagem.replace(/{nome}/g,lead.nome.split(" ")[0]).replace(/{academia}/g,ACADEMIAS[lead.academia]));
    setModalWA(lead);
  }

  function enviarWA(){
    window.open(`https://wa.me/55${modalWA.telefone.replace(/\D/g,"")}?text=${encodeURIComponent(msgWA)}`,"_blank");
    setModalWA(null);
  }

  function exportarCSV(){
    const linhas=[["ID","Nome","Telefone","Origem","Unidade","Etapa","Status","Motivo","Data"]];
    leadsFiltrados.forEach(l=>linhas.push([l.id,l.nome,l.telefone,l.origem,ACADEMIAS[l.academia],ETAPAS[l.etapa],l.fechou===true?"Fechou":l.fechou===false?"Perdido":"Em andamento",l.motivoPerda||"",l.data]));
    const csv=linhas.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="leads_crm4b.csv"; a.click();
  }

  if(!carregado) return <div style={{padding:"3rem",textAlign:"center",color:"var(--color-text-secondary)",fontSize:13}}>Carregando CRM4B...</div>;

  if(!usuario) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:420,fontFamily:"var(--font-sans)"}}>
      <div style={{width:340,padding:"2.5rem 2rem",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:16}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:24,fontWeight:500,marginBottom:6}}>CRM4B</div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Entre com seu acesso</div>
        </div>
        <div style={css.field}>
          <label style={css.label}>Usuário</label>
          <input value={loginForm.login} onChange={e=>setLoginForm(f=>({...f,login:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&fazerLogin()} placeholder="Ex: brooklin" style={css.inp}/>
        </div>
        <div style={css.field}>
          <label style={css.label}>Senha</label>
          <input type="password" value={loginForm.senha} onChange={e=>setLoginForm(f=>({...f,senha:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&fazerLogin()} placeholder="••••••••" style={css.inp}/>
        </div>
        {loginErro && <div style={{fontSize:12,color:"#D85A30",marginBottom:14,textAlign:"center"}}>{loginErro}</div>}
        <button onClick={fazerLogin} style={{...css.btn(true),width:"100%",padding:"11px",fontSize:14}}>Entrar</button>
        <div style={{textAlign:"center",marginTop:24,fontSize:11,color:"var(--color-text-secondary)"}}>Desenvolvido por Rogério Sthanke · 2026</div>
      </div>
    </div>
  );

  return (
    <div style={css.page}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:500}}>CRM4B</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{usuario.role==="admin"?"Administrador — visão geral da rede":usuario.nome}</div>
        </div>
        <span style={{fontSize:11,color:salvando?"#EF9F27":"#1D9E75",background:salvando?"#EF9F2711":"#1D9E7511",borderRadius:6,padding:"3px 10px"}}>{salvando?"Salvando...":"Salvo"}</span>
        {fuAtrasados.length>0 && <span style={{background:"#D85A3022",color:"#D85A30",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500}}>{fuAtrasados.length} atrasado{fuAtrasados.length>1?"s":""}</span>}
        {fuHoje.length>0 && <span style={{background:"#EF9F2722",color:"#EF9F27",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:500}}>{fuHoje.length} hoje</span>}
        <button onClick={fazerLogout} style={{...css.btn(false),padding:"6px 14px",fontSize:12}}>Sair</button>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        {usuario.role==="admin" && (
          <select value={acadFiltro} onChange={e=>setAcadFiltro(+e.target.value)} style={{...css.inp,width:"auto",padding:"8px 12px"}}>
            {ACADEMIAS.map((a,i)=><option key={i} value={i}>{a}</option>)}
          </select>
        )}
        <select value={aba} onChange={e=>setAba(e.target.value)} style={{...css.inp,width:"auto",padding:"8px 12px",marginLeft:"auto",fontWeight:500}}>
          <option value="dashboard">Dashboard</option>
          <option value="funil">Funil</option>
          <option value="leads">Leads</option>
          <option value="followup">Follow-up</option>
          <option value="mensagens">Mensagens</option>
          {usuario.role==="admin" && <option value="acessos">Acessos</option>}
        </select>
      </div>

      {aba==="dashboard" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
            {[
              {l:"Total Leads",v:stats.total,c:"#7F77DD"},
              {l:"Orgânicos",v:stats.organicos,c:"#1D9E75"},
              {l:"Tráfego Pago",v:stats.pago,c:"#EF9F27"},
              {l:"Fechados",v:stats.fechados,c:"#1D9E75"},
              {l:"Perdidos",v:stats.perdidos,c:"#D85A30"},
              {l:"Conversão",v:stats.conv+"%",c:"#378ADD"},
              {l:"FU Atrasados",v:fuAtrasados.length,c:"#D85A30"},
              {l:"FU Hoje",v:fuHoje.length,c:"#EF9F27"},
            ].map(m=>(
              <div key={m.l} style={{background:"var(--color-background-secondary)",borderRadius:10,padding:"1rem"}}>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{m.l}</div>
                <div style={{fontSize:24,fontWeight:500,color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={css.card}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>Funil por etapa</div>
              {ETAPAS.map((e,i)=>(
                <div key={e} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:"var(--color-text-secondary)"}}>{e}</span>
                    <span style={{fontWeight:500}}>{stats.porEtapa[i]}</span>
                  </div>
                  <div style={{height:6,background:"var(--color-background-secondary)",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:stats.total>0?`${(stats.porEtapa[i]/stats.total)*100}%`:"0%",height:"100%",background:CORES_ETAPA[i],borderRadius:4}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={css.card}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>Motivos de perda</div>
              {Object.keys(stats.motivosPerda).length===0
                ? <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Nenhuma perda registrada</div>
                : Object.entries(stats.motivosPerda).sort((a,b)=>b[1]-a[1]).map(([m,n])=>(
                  <div key={m} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                    <span style={{color:"var(--color-text-secondary)"}}>{m}</span>
                    <span style={{fontWeight:500,color:"#D85A30"}}>{n}</span>
                  </div>
                ))
              }
            </div>
          </div>
          {usuario.role==="admin" && (
            <div style={css.card}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:14}}>Ranking por unidade</div>
              {leadsVisiveis.length===0
                ? <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Nenhum lead cadastrado ainda.</div>
                : <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                    <thead><tr style={{color:"var(--color-text-secondary)"}}>
                      {["Unidade","Leads","Fechados","Conversão"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",fontWeight:400,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {stats.porAcademia.sort((a,b)=>+b.conv-+a.conv).map((ac,i)=>(
                        <tr key={ac.nome} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                          <td style={{padding:"8px 10px",fontWeight:i===0?500:400}}>{ac.nome}</td>
                          <td style={{padding:"8px 10px"}}>{ac.total}</td>
                          <td style={{padding:"8px 10px",color:"#1D9E75"}}>{ac.fechados}</td>
                          <td style={{padding:"8px 10px"}}><span style={{background:+ac.conv>40?"#1D9E7522":"#D85A3022",color:+ac.conv>40?"#1D9E75":"#D85A30",borderRadius:6,padding:"3px 10px"}}>{ac.conv}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          )}
        </div>
      )}

      {aba==="funil" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {ETAPAS.map((e,i)=>{
            const ls=leadsFiltrados.filter(l=>l.etapa===i);
            return (
              <div key={e}>
                <div style={{textAlign:"center",marginBottom:10}}>
                  <div style={{display:"inline-block",background:CORES_ETAPA[i]+"22",color:CORES_ETAPA[i],borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:500,marginBottom:6}}>{e}</div>
                  <div style={{fontSize:20,fontWeight:500,color:CORES_ETAPA[i]}}>{ls.length}</div>
                </div>
                {ls.length===0 && <div style={{textAlign:"center",fontSize:12,color:"var(--color-text-secondary)"}}>Vazio</div>}
                {ls.map(l=>{
                  const fuPend=(l.followups||[]).filter(f=>!f.feito);
                  return (
                    <div key={l.id} onClick={()=>setDetalhe(l)} style={{...css.card,cursor:"pointer",borderLeft:`3px solid ${CORES_ETAPA[i]}`,padding:"0.75rem",marginBottom:8}}>
                      <div style={{fontWeight:500,fontSize:12,marginBottom:4}}>{l.nome}</div>
                      <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>{ACADEMIAS[l.academia]}</div>
                      {fuPend.length>0 && <div style={{fontSize:11,color:"#EF9F27",marginBottom:4}}>Follow-up pendente</div>}
                      {l.fechou===true && <span style={css.badge("#1D9E75")}>Fechou</span>}
                      {l.fechou===false && <span style={css.badge("#D85A30")}>Perdido</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {aba==="leads" && (
        <div>
          <div style={{marginBottom:14}}>
            <input placeholder="Buscar por nome ou telefone..." value={busca} onChange={e=>setBusca(e.target.value)} style={{...css.inp,marginBottom:10}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto auto",gap:10}}>
              <select value={filtroOrigem} onChange={e=>setFiltroOrigem(e.target.value)} style={css.inp}>
                <option>Todos</option>{ORIGENS.map(o=><option key={o}>{o}</option>)}
              </select>
              <select value={filtroEtapa} onChange={e=>setFiltroEtapa(e.target.value)} style={css.inp}>
                <option>Todos</option>{ETAPAS.map(e=><option key={e}>{e}</option>)}
              </select>
              <button onClick={exportarCSV} style={css.btn(false)}>Exportar CSV</button>
              <button onClick={abrirNovo} style={css.btn(true)}>+ Novo Lead</button>
            </div>
          </div>
          {leadsFiltrados.length===0 && <div style={{textAlign:"center",padding:"3rem",color:"var(--color-text-secondary)",fontSize:13}}>{leadsVisiveis.length===0?"Nenhum lead ainda. Clique em + Novo Lead para começar!":"Nenhum lead encontrado."}</div>}
          {leadsFiltrados.map(l=>{
            const fuPend=(l.followups||[]).filter(f=>!f.feito);
            const fuAtras=fuPend.filter(f=>new Date(f.data.split("/").reverse().join("-"))<hoje());
            return (
              <div key={l.id} style={{...css.card,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setDetalhe(l)}>
                <div style={{width:40,height:40,borderRadius:"50%",background:CORES_ETAPA[l.etapa]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:CORES_ETAPA[l.etapa],flexShrink:0}}>
                  {l.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:14,marginBottom:3}}>{l.nome}</div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:3}}>{l.telefone} · {ACADEMIAS[l.academia]}</div>
                  {fuAtras.length>0 && <div style={{fontSize:12,color:"#D85A30"}}>Follow-up atrasado</div>}
                  {fuAtras.length===0&&fuPend.length>0 && <div style={{fontSize:12,color:"#EF9F27"}}>Follow-up agendado</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end",flexShrink:0}}>
                  <span style={css.badge(CORES_ETAPA[l.etapa])}>{ETAPAS[l.etapa]}</span>
                  <span style={css.badge(l.origem==="Orgânico"?"#1D9E75":"#EF9F27")}>{l.origem}</span>
                  {l.fechou===true && <span style={css.badge("#1D9E75")}>Fechou</span>}
                  {l.fechou===false && <span style={css.badge("#D85A30")}>Perdido</span>}
                </div>
                <button onClick={e=>{e.stopPropagation();abrirWA(l);}} style={{...css.btn(true,"#25D366"),flexShrink:0}}>WhatsApp</button>
              </div>
            );
          })}
        </div>
      )}

      {aba==="followup" && (
        <div>
          {[{titulo:"Atrasados",lista:fuAtrasados,cor:"#D85A30"},{titulo:"Para hoje",lista:fuHoje,cor:"#EF9F27"},{titulo:"Próximos",lista:fuFuturos,cor:"#1D9E75"}].map(grupo=>(
            <div key={grupo.titulo} style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <span style={{fontSize:14,fontWeight:500,color:grupo.cor}}>{grupo.titulo}</span>
                <span style={{background:grupo.cor+"22",color:grupo.cor,borderRadius:10,padding:"2px 10px",fontSize:12}}>{grupo.lista.length}</span>
              </div>
              {grupo.lista.length===0 && <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:8}}>Nenhum</div>}
              {grupo.lista.map(f=>(
                <div key={f.id} style={{...css.card,borderLeft:`3px solid ${grupo.cor}`,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>{f.lead.nome}</div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{ACADEMIAS[f.lead.academia]} · {ETAPAS[f.lead.etapa]}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={css.badge(f.tipo==="Ligação"?"#7F77DD":"#25D366")}>{f.tipo}</span>
                      <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{f.data} às {f.hora}</span>
                    </div>
                    {f.obs && <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:6}}>"{f.obs}"</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                    <button onClick={()=>abrirWA(f.lead)} style={{...css.btn(true,"#25D366"),padding:"6px 12px",fontSize:12}}>WhatsApp</button>
                    <button onClick={()=>marcarFeito(f.lead.id,f.id,"Atendeu")} style={{...css.btn(true,"#1D9E75"),padding:"6px 12px",fontSize:12}}>Atendeu</button>
                    <button onClick={()=>marcarFeito(f.lead.id,f.id,"Não atendeu")} style={{...css.btn(true,"#D85A30"),padding:"6px 12px",fontSize:12}}>Não atendeu</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {aba==="mensagens" && (
        <div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16}}>Mensagens enviadas pelo WhatsApp conforme a etapa do lead. Clique para editar.</div>
          {templates.map((tpl,i)=>(
            <div key={i} style={{...css.card,borderLeft:`3px solid ${CORES_ETAPA[i]}`}}>
              {editTpl===i ? (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <span style={css.badge(CORES_ETAPA[i])}>{ETAPAS[i]}</span>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setEditTpl(null)} style={{...css.btn(false),padding:"5px 12px",fontSize:12}}>Cancelar</button>
                      <button onClick={()=>setEditTpl(null)} style={{...css.btn(true),padding:"5px 12px",fontSize:12}}>Salvar</button>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:8}}>Use {"{nome}"} e {"{academia}"} para personalizar automaticamente.</div>
                  <textarea value={tpl.mensagem} onChange={e=>setTemplates(prev=>prev.map((t,j)=>j===i?{...t,mensagem:e.target.value}:t))} rows={10} style={{...css.inp,resize:"vertical",lineHeight:1.7}}/>
                </div>
              ) : (
                <div style={{display:"flex",gap:14}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <span style={css.badge(CORES_ETAPA[i])}>{ETAPAS[i]}</span>
                      <span style={{fontSize:13,fontWeight:500}}>{tpl.titulo}</span>
                    </div>
                    <div style={{fontSize:13,color:"var(--color-text-secondary)",whiteSpace:"pre-wrap",lineHeight:1.8,background:"var(--color-background-secondary)",borderRadius:8,padding:"12px 14px"}}>{tpl.mensagem}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
                    <button onClick={()=>setEditTpl(i)} style={{...css.btn(false),padding:"6px 14px",fontSize:12}}>Editar</button>
                    <button onClick={()=>setTemplates(prev=>prev.map((t,j)=>j===i?{...t,mensagem:TEMPLATES_DEFAULT[i].mensagem}:t))} style={{...css.btn(false),padding:"6px 14px",fontSize:12,color:"#D85A30"}}>Restaurar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aba==="acessos" && usuario.role==="admin" && (
        <div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16}}>Logins e senhas de cada unidade. Somente você tem acesso a esta aba.</div>
          <div style={{marginBottom:14,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>setMostrarSenhas(!mostrarSenhas)} style={{...css.btn(false),padding:"6px 14px",fontSize:12}}>{mostrarSenhas?"Ocultar senhas":"Mostrar senhas"}</button>
          </div>
          {USUARIOS.map(u=>(
            <div key={u.id} style={{...css.card,display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:u.role==="admin"?"#7F77DD22":"#1D9E7522",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:u.role==="admin"?"#7F77DD":"#1D9E75",flexShrink:0}}>
                {u.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>{u.nome}</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>
                  Usuário: <strong style={{fontWeight:500,color:"var(--color-text-primary)"}}>{u.login}</strong>
                  {"  ·  "}
                  Senha: <strong style={{fontWeight:500,color:"var(--color-text-primary)"}}>{mostrarSenhas?u.senha:"••••••••"}</strong>
                </div>
              </div>
              <span style={css.badge(u.role==="admin"?"#7F77DD":"#1D9E75")}>{u.role==="admin"?"Admin":"Unidade"}</span>
            </div>
          ))}
          <div style={{marginTop:14,padding:"14px",background:"#EF9F2711",border:"0.5px solid #EF9F2744",borderRadius:8,fontSize:13,color:"#EF9F27"}}>
            Para alterar senhas entre em contato com Rogério Sthanke.
          </div>
        </div>
      )}

      {detalhe && (
        <div style={css.overlay} onClick={()=>setDetalhe(null)}>
          <div style={css.modal} onClick={e=>e.stopPropagation()}>
            <div style={css.modalHeader}>
              <h3 style={{margin:0,fontSize:16,fontWeight:500}}>{detalhe.nome}</h3>
              <button onClick={()=>setDetalhe(null)} style={css.closeBtn}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[["Telefone",detalhe.telefone],["Unidade",ACADEMIAS[detalhe.academia]],["Origem",detalhe.origem],["Etapa",ETAPAS[detalhe.etapa]],["Data entrada",detalhe.data]].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:400}}>{v}</div>
                </div>
              ))}
              {detalhe.fechou===false && <div><div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3}}>Motivo perda</div><div style={{fontSize:13,color:"#D85A30"}}>{detalhe.motivoPerda}</div></div>}
            </div>
            <div style={css.divider}/>
            {(()=>{
              const tentativas=(detalhe.followups||[]).filter(f=>f.feito).length;
              const pendentes=(detalhe.followups||[]).filter(f=>!f.feito).length;
              const esgotado=tentativas>=MAX_TENTATIVAS;
              return (
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,fontWeight:500}}>Follow-ups</span>
                      <div style={{display:"flex",gap:4}}>
                        {Array.from({length:MAX_TENTATIVAS}).map((_,i)=>(
                          <div key={i} style={{width:14,height:14,borderRadius:"50%",border:`1.5px solid ${i<tentativas?"#7F77DD":"var(--color-border-secondary)"}`,background:i<tentativas?"#7F77DD":"transparent"}}/>
                        ))}
                      </div>
                      <span style={{fontSize:12,color:esgotado?"#D85A30":"var(--color-text-secondary)"}}>{tentativas}/{MAX_TENTATIVAS}</span>
                    </div>
                    {!esgotado&&pendentes===0 && <button onClick={()=>{setModalFU(detalhe.id);setFormFU({data:"",hora:"09:00",tipo:"Ligação",obs:""}); }} style={{...css.btn(true),padding:"5px 12px",fontSize:12}}>+ Agendar</button>}
                  </div>
                  {esgotado && <div style={{background:"#D85A3011",border:"0.5px solid #D85A3044",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#D85A30"}}>Limite de 6 tentativas atingido.</div>}
                  {pendentes>0&&!esgotado && <div style={{background:"#EF9F2711",border:"0.5px solid #EF9F2744",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#EF9F27"}}>Conclua o follow-up pendente antes de agendar outro.</div>}
                  {(detalhe.followups||[]).length===0 && <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>Nenhum follow-up agendado</div>}
                  {(detalhe.followups||[]).map((f,idx)=>(
                    <div key={f.id} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:f.feito?(f.resultado==="Atendeu"?"#1D9E75":"#D85A30"):"#7F77DD",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0,fontWeight:500}}>{idx+1}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{f.tipo} · {f.data} às {f.hora}</div>
                        {f.obs && <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{f.obs}</div>}
                        {f.feito && <span style={css.badge(f.resultado==="Atendeu"?"#1D9E75":"#D85A30")}>{f.resultado}</span>}
                      </div>
                      {!f.feito && (
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>marcarFeito(detalhe.id,f.id,"Atendeu")} style={{...css.btn(true,"#1D9E75"),padding:"5px 10px",fontSize:11}}>Atendeu</button>
                          <button onClick={()=>marcarFeito(detalhe.id,f.id,"Não atendeu")} style={{...css.btn(true,"#D85A30"),padding:"5px 10px",fontSize:11}}>Não atendeu</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={css.divider}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>abrirWA(detalhe)} style={{...css.btn(true,"#25D366"),padding:"10px"}}>WhatsApp</button>
              <button onClick={()=>abrirEditar(detalhe)} style={{...css.btn(false),padding:"10px"}}>Editar</button>
              {detalhe.etapa<4 && <button onClick={()=>avancarEtapa(detalhe)} style={{...css.btn(true),padding:"10px",gridColumn:"1/-1"}}>Avançar etapa</button>}
              {detalhe.etapa===4&&detalhe.fechou===null && (
                <>
                  <button onClick={()=>fecharPlano(detalhe,true)} style={{...css.btn(true,"#1D9E75"),padding:"10px"}}>Fechou!</button>
                  <button onClick={()=>fecharPlano(detalhe,false)} style={{...css.btn(true,"#D85A30"),padding:"10px"}}>Perdido</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalWA && (
        <div style={css.overlay} onClick={()=>setModalWA(null)}>
          <div style={{...css.modal,width:480}} onClick={e=>e.stopPropagation()}>
            <div style={css.modalHeader}>
              <div>
                <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:500}}>Mensagem para {modalWA.nome.split(" ")[0]}</h3>
                <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>Etapa: {ETAPAS[modalWA.etapa]} · Edite antes de enviar se quiser</div>
              </div>
              <button onClick={()=>setModalWA(null)} style={css.closeBtn}>✕</button>
            </div>
            <textarea value={msgWA} onChange={e=>setMsgWA(e.target.value)} rows={12} style={{...css.inp,resize:"vertical",lineHeight:1.8,marginBottom:16}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setModalWA(null)} style={{...css.btn(false),padding:"10px"}}>Cancelar</button>
              <button onClick={enviarWA} style={{...css.btn(true,"#25D366"),padding:"10px"}}>Enviar no WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {modalFU!==null && (
        <div style={css.overlay} onClick={()=>setModalFU(null)}>
          <div style={{...css.modal,width:400}} onClick={e=>e.stopPropagation()}>
            <div style={css.modalHeader}>
              <h3 style={{margin:0,fontSize:15,fontWeight:500}}>Agendar Follow-up</h3>
              <button onClick={()=>setModalFU(null)} style={css.closeBtn}>✕</button>
            </div>
            <div style={css.field}>
              <label style={css.label}>Tipo de contato</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {["Ligação","WhatsApp"].map(t=>(
                  <button key={t} onClick={()=>setFormFU(f=>({...f,tipo:t}))} style={{...css.btn(formFU.tipo===t),padding:"10px",background:formFU.tipo===t?(t==="Ligação"?"#7F77DD":"#25D366"):"var(--color-background-secondary)"}}>
                    {t==="Ligação"?"Ligação":"WhatsApp"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={css.label}>Data</label>
                <input type="date" value={formFU.data} onChange={e=>setFormFU(f=>({...f,data:e.target.value}))} style={css.inp}/>
              </div>
              <div>
                <label style={css.label}>Horário</label>
                <input type="time" value={formFU.hora} onChange={e=>setFormFU(f=>({...f,hora:e.target.value}))} style={css.inp}/>
              </div>
            </div>
            <div style={css.field}>
              <label style={css.label}>Observação</label>
              <input placeholder="Ex: Ligar para confirmar aula..." value={formFU.obs} onChange={e=>setFormFU(f=>({...f,obs:e.target.value}))} style={css.inp}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setModalFU(null)} style={{...css.btn(false),padding:"10px"}}>Cancelar</button>
              <button onClick={salvarFU} style={{...css.btn(true),padding:"10px"}}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {modal!==null && (
        <div style={css.overlay} onClick={()=>setModal(null)}>
          <div style={css.modal} onClick={e=>e.stopPropagation()}>
            <div style={css.modalHeader}>
              <h3 style={{margin:0,fontSize:16,fontWeight:500}}>{modal==="novo"?"Novo Lead":"Editar Lead"}</h3>
              <button onClick={()=>setModal(null)} style={css.closeBtn}>✕</button>
            </div>
            <div style={css.field}>
              <label style={css.label}>Nome completo</label>
              <input type="text" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Ana Lima" style={css.inp}/>
            </div>
            <div style={css.field}>
              <label style={css.label}>Telefone</label>
              <input type="tel" value={form.telefone||""} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="Ex: (11) 99999-9999" style={css.inp}/>
            </div>
            <div style={css.field}>
              <label style={css.label}>Origem do lead</label>
              <select value={form.origem||"Orgânico"} onChange={e=>setForm(f=>({...f,origem:e.target.value}))} style={css.inp}>
                {ORIGENS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            {usuario.role==="admin" && (
              <div style={css.field}>
                <label style={css.label}>Unidade</label>
                <select value={form.academia||1} onChange={e=>setForm(f=>({...f,academia:+e.target.value}))} style={css.inp}>
                  {ACADEMIAS.slice(1).map((a,i)=><option key={i+1} value={i+1}>{a}</option>)}
                </select>
              </div>
            )}
            <div style={css.field}>
              <label style={css.label}>Etapa no funil</label>
              <select value={form.etapa||0} onChange={e=>setForm(f=>({...f,etapa:+e.target.value}))} style={css.inp}>
                {ETAPAS.map((e,i)=><option key={i} value={i}>{e}</option>)}
              </select>
            </div>
            <div style={css.field}>
              <label style={css.label}>Notas</label>
              <textarea value={form.notas||""} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} rows={3} placeholder="Observações sobre o lead..." style={{...css.inp,resize:"vertical",lineHeight:1.6}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
              <button onClick={()=>setModal(null)} style={{...css.btn(false),padding:"11px"}}>Cancelar</button>
              <button onClick={salvarLead} style={{...css.btn(true),padding:"11px"}}>Salvar Lead</button>
            </div>
          </div>
        </div>
      )}

      <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",marginTop:"2.5rem",paddingTop:"1rem",textAlign:"center"}}>
        <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>Desenvolvido por <strong style={{fontWeight:500,color:"var(--color-text-primary)"}}>Rogério Sthanke</strong> · 2026 · Todos os direitos reservados</span>
      </div>
    </div>
  );
}
