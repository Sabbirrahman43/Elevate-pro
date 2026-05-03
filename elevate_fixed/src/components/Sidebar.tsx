import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, CheckSquare, ListTodo, Bot, Settings, Shield, Sun, Moon, LogOut, Zap, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

// Ninja fight canvas for sidebar
const SidebarNinja: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = 288, H = canvas.height = 180, G = H - 14;
    const pts: any[] = [];
    const boom = (x:number,y:number,c:string,n=10) => { for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=4+Math.random()*8;pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-4,life:1,decay:0.04+Math.random()*0.04,r:2+Math.random()*4,c});} };

    const draw = (x:number,y:number,right:boolean,st:string,fr:number,hb:string,sc=1.0) => {
      ctx.save(); ctx.translate(x,y); if(!right)ctx.scale(-1,1); ctx.scale(sc,sc);
      const t=fr*0.2;
      let fL=0.15,bL=-0.15,fA=-0.3,bA=0.35,lean=0,kb=0;
      if(st==='run'){const s=Math.sin(t*3);fL=s*0.85;bL=-s*0.85;fA=-s*0.7;bA=s*0.7;lean=0.25;kb=Math.abs(s)*0.5;}
      else if(st==='a1'){fA=-1.8;bA=0.9;fL=0.5;lean=0.4;}
      else if(st==='a2'){fL=-1.6;fA=-0.9;lean=0.3;}
      else if(st==='a3'){fA=-2.4+Math.sin(t*6)*0.7;lean=0.45;}
      else if(st==='jump'){fL=-0.7;bL=0.7;fA=-1.2;bA=-0.6;kb=0.8;}
      else if(st==='hurt'){lean=-0.5;fA=1.0;bA=0.8;}
      const body='rgba(10,10,15,0.97)',hR=10,bH=26,lH=30,aL=20;
      const shY=-bH-hR*2+3,hipY=-lH+3,bx=Math.sin(lean)*4;
      ctx.strokeStyle=body;ctx.fillStyle=body;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=8;
      ctx.globalAlpha=0.35;
      ctx.beginPath();ctx.moveTo(0,hipY);const bkx=Math.sin(bL)*lH*0.5,bky=hipY+Math.cos(Math.abs(bL))*lH*0.5+kb*12;ctx.lineTo(bkx,bky);ctx.lineTo(bkx+Math.sin(bL+kb)*lH*0.45,bky+lH*0.5);ctx.stroke();
      const baex=Math.sin(bA)*aL*0.5,baey=shY+Math.cos(Math.abs(bA))*aL*0.5;ctx.beginPath();ctx.moveTo(0,shY);ctx.lineTo(baex,baey);ctx.lineTo(baex+Math.sin(bA*0.7)*aL*0.5,baey+aL*0.45);ctx.stroke();
      ctx.globalAlpha=1;
      ctx.beginPath();ctx.moveTo(0,hipY);ctx.lineTo(bx,shY);ctx.stroke();
      ctx.beginPath();ctx.arc(bx,shY-hR,hR,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(bx,shY-hR,hR+2,Math.PI*0.7,Math.PI*0.3);ctx.strokeStyle=hb;ctx.lineWidth=3;ctx.shadowColor=hb;ctx.shadowBlur=18;ctx.stroke();
      ctx.strokeStyle=body;ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=8;ctx.lineWidth=3.5;
      const fkx=Math.sin(fL)*lH*0.5,fky=hipY+Math.cos(Math.abs(fL))*lH*0.5+kb*10;ctx.beginPath();ctx.moveTo(0,hipY);ctx.lineTo(fkx,fky);ctx.lineTo(fkx+Math.sin(fL+kb*0.5)*lH*0.45,fky+lH*0.5);ctx.stroke();
      const faex=bx+Math.sin(fA)*aL*0.5,faey=shY+Math.cos(Math.abs(fA))*aL*0.5,fahx=faex+Math.sin(fA*0.8)*aL*0.5,fahy=faey+aL*0.5;
      ctx.beginPath();ctx.moveTo(bx,shY);ctx.lineTo(faex,faey);ctx.lineTo(fahx,fahy);ctx.stroke();
      const sa=fA-0.2,sL=st.startsWith('a')?52:34;
      ctx.beginPath();ctx.moveTo(fahx,fahy);ctx.lineTo(fahx+Math.sin(sa)*sL,fahy-Math.cos(sa)*sL*0.35);
      ctx.strokeStyle=hb==='rgba(80,180,255,0.95)'?'rgba(150,220,255,0.9)':'rgba(255,255,255,0.4)';ctx.shadowColor=hb;ctx.shadowBlur=st.startsWith('a')?26:10;ctx.lineWidth=2;ctx.stroke();
      if(st==='a1'||st==='a3'){for(let i=1;i<=4;i++){ctx.beginPath();ctx.moveTo(fahx,fahy);ctx.lineTo(fahx+Math.sin(sa+i*0.18)*sL*0.8,fahy-Math.cos(sa+i*0.18)*sL*0.3);ctx.strokeStyle=`rgba(255,255,255,${0.1/i})`;ctx.lineWidth=10-i*2;ctx.shadowBlur=0;ctx.stroke();}}
      ctx.restore();
    };

    type F={x:number;y:number;vy:number;st:string;t:number;fr:number;right:boolean;hb:string;kb:number;};
    const hero:F={x:50,y:G,vy:0,st:'idle',t:30,fr:0,right:true,hb:'rgba(80,180,255,0.95)',kb:0};
    const enemies:F[]=[
      {x:220,y:G,vy:0,st:'idle',t:40,fr:0,right:false,hb:'rgba(255,255,255,0.3)',kb:0},
      {x:260,y:G,vy:0,st:'idle',t:65,fr:0,right:false,hb:'rgba(255,255,255,0.2)',kb:0},
      {x:180,y:G,vy:0,st:'idle',t:52,fr:0,right:false,hb:'rgba(255,255,255,0.15)',kb:0},
    ];

    const upd = (f:F, tx:number, isHero:boolean) => {
      f.fr++; f.t--;
      if(f.kb!==0){f.x+=f.kb;f.kb*=0.6;if(Math.abs(f.kb)<0.4)f.kb=0;}
      if(f.y<G){f.vy+=1.3;f.y+=f.vy;if(f.y>=G){f.y=G;f.vy=0;if(f.st==='jump')f.st='idle';}}
      // Respawn enemy if knocked far off
      if(!isHero&&f.x<20){f.x=200+Math.random()*70;f.st='idle';f.t=30;}
      if(f.t>0)return;
      const dist=Math.abs(f.x-tx),r=Math.random();
      if(isHero){
        if(dist<75){
          // CLOSE - attack and knock them back
          const atk=r<0.45?'a1':r<0.7?'a2':'a3'; f.st=atk; f.t=10+Math.floor(r*8);
          enemies.forEach(e=>{if(Math.abs(e.x-f.x)<85){e.kb=30;e.st='hurt';e.t=12;boom((f.x+e.x)/2,G-60,'rgba(80,180,255,0.8)',10);}});
        } else if(dist<160){
          if(r<0.4){f.st='jump';f.t=22;f.vy=-18;}
          else{f.st='a1';f.t=12;boom(f.x+55,G-55,'rgba(80,180,255,0.6)',6);}
        } else {
          f.st='run';f.t=8;f.x=Math.min(f.x+45,W-25);
        }
      } else {
        if(f.st==='hurt'){f.st='idle';f.t=18;return;}
        if(dist<90){
          if(r<0.4){f.st='a1';f.t=14;}
          else if(r<0.65){f.st='a2';f.t=16;}
          else if(r<0.8){f.st='jump';f.t=20;f.vy=-15;}
          else{f.st='idle';f.t=15;}
        } else {
          f.st='run';f.t=10;f.x=Math.max(f.x-40,tx+65);
        }
      }
      f.x=Math.max(15,Math.min(W-15,f.x));
    };

    let animId:number;
    const loop=()=>{
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(0,G+1,W,1);
      const nearestEnemy=enemies.reduce((a,b)=>Math.abs(b.x-hero.x)<Math.abs(a.x-hero.x)?b:a);
      upd(hero,nearestEnemy.x,true);
      enemies.forEach(e=>upd(e,hero.x,false));
      [hero,...enemies].forEach(f=>{ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle='rgba(0,0,0,1)';ctx.beginPath();ctx.ellipse(f.x,G+3,22,5,0,0,Math.PI*2);ctx.fill();ctx.restore();});
      enemies.forEach(e=>draw(e.x,e.y,e.right,e.st,e.fr,e.hb,0.82));
      draw(hero.x,hero.y,hero.right,hero.st,hero.fr,hero.hb,1.0);
      for(let i=pts.length-1;i>=0;i--){const p=pts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.35;p.life-=p.decay;if(p.life<=0){pts.splice(i,1);continue;}ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);ctx.fill();ctx.restore();}
      animId=requestAnimationFrame(loop);
    };
    animId=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(animId);
  },[]);
  return <canvas ref={canvasRef} width={288} height={180} className="w-full" style={{opacity:0.88}} />;
};


type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { userProfile, theme, setTheme, logout, markNotificationsRead } = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = userProfile?.notifications?.filter(n => !n.read).length || 0;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'habits', label: 'Habits', icon: CheckSquare },
    { id: 'tasks', label: 'Daily Tasks', icon: ListTodo },
    { id: 'ai', label: 'Intelligence', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Add Admin tab if user is the admin
  if (userProfile?.email === 'prantorahman6900@gmail.com') {
    tabs.push({ id: 'admin', label: 'Admin Control', icon: Shield });
  }

  return (
    <div className="w-72 bg-[#141414] dark:bg-[#050505] text-[#E4E3E0] h-full flex flex-col border-r border-white/10 transition-colors duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tighter text-white">Elevate<span className="text-emerald-500">.</span></h1>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center space-x-2 p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white border border-white/5"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="text-[10px] font-bold uppercase tracking-widest">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white border border-white/5"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-4 right-4 top-24 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 max-h-[300px] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Notifications</h4>
                <button 
                  onClick={markNotificationsRead}
                  className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400"
                >
                  Mark all read
                </button>
              </div>
              <div className="space-y-3">
                {userProfile?.notifications?.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-4">No notifications</p>
                ) : (
                  userProfile.notifications.map(n => (
                    <div key={n.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-xs font-bold text-white mb-1">{n.title}</p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{n.message}</p>
                      <p className="text-[8px] text-gray-600 mt-2">{new Date(n.date).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Progress Tracker</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-6 border-t border-white/10 space-y-4">
        {/* Ninja fight animation */}
        <div className="rounded-2xl overflow-hidden border border-white/5">
          <SidebarNinja />
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-lg shadow-emerald-900/20">
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span>{userProfile?.name?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="text-sm overflow-hidden flex-1">
            <p className="font-medium text-white truncate">{userProfile?.name || 'User'}</p>
            <p className="text-[10px] text-gray-400 truncate">{userProfile?.email || 'Operative'}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
        <div className="pt-2 border-t border-white/5">
          <a 
            href="https://www.instagram.com/pranto_raman/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-emerald-500 transition-colors group"
          >
            <span>Developed by</span>
            <span className="text-gray-400 group-hover:text-emerald-400">@pranto_raman</span>
          </a>
        </div>
      </div>
    </div>
  );
};
