# -*- coding: utf-8 -*-
"""Generate ORIGINAL art + music for the project (no third-party assets except PokeAPI Pokemon sprites)."""
import os, random, math, wave, struct, subprocess, sys
from PIL import Image, ImageDraw
sys.path.insert(0,"tools")
import game_data as GD
OUT="assets/gen"; os.makedirs(OUT+"/tiles",exist_ok=True); os.makedirs(OUT+"/ui",exist_ok=True); os.makedirs(OUT+"/bgm",exist_ok=True)
# theme -> (floor, wall, grass, water, door)
PAL={
"town":((214,196,150),(150,92,70),(110,180,90),(70,140,210),(250,220,90)),
"meadow":((190,220,140),(80,120,70),(80,170,70),(70,150,220),(250,220,90)),
"forest":((120,150,90),(40,90,50),(50,130,60),(60,120,170),(250,220,90)),
"quarry":((190,170,140),(120,110,100),(130,160,100),(80,140,200),(250,220,90)),
"cave":((90,85,100),(45,40,55),(70,110,80),(50,90,150),(230,200,90)),
"canal":((180,190,200),(90,110,130),(100,170,130),(40,110,200),(250,220,90)),
"coast":((230,220,170),(110,130,150),(120,190,120),(60,150,220),(250,220,90)),
"harbor":((170,160,150),(70,90,120),(110,170,110),(40,100,180),(250,220,90)),
"ship":((120,100,80),(60,45,35),(80,120,90),(40,80,130),(230,200,90)),
"market":((225,200,160),(170,100,60),(110,190,90),(80,150,210),(250,220,90)),
"cellar":((110,100,90),(55,45,40),(70,110,70),(50,90,130),(230,200,90)),
"rail":((170,170,160),(80,80,90),(110,170,100),(70,140,200),(250,220,90)),
"hill":((160,190,120),(100,110,90),(90,170,80),(70,140,200),(250,220,90)),
"lab":((225,230,235),(120,130,150),(120,190,150),(80,160,220),(120,220,250)),
"swamp":((100,120,80),(50,70,40),(70,120,50),(60,100,90),(230,200,90)),
"city":((200,200,210),(100,100,130),(120,185,120),(70,140,210),(250,220,90)),
"tide":((220,210,170),(120,120,140),(110,180,130),(50,130,200),(250,220,90)),
"volcano":((120,80,70),(60,35,30),(120,110,60),(220,90,40),(250,200,60)),
"desert":((230,200,130),(170,120,70),(160,170,90),(80,150,200),(250,220,90)),
"hq":((90,90,100),(30,30,40),(90,90,70),(60,70,100),(230,60,60)),
"mountain":((170,170,170),(100,100,110),(110,160,110),(80,140,210),(250,220,90)),
"road":((190,180,160),(110,100,100),(100,170,90),(70,140,200),(250,220,90)),
"league":((235,225,200),(120,90,150),(120,190,120),(80,150,220),(255,215,0)),
"gym_rock":((170,150,130),(110,90,80),(110,150,100),(70,130,190),(250,220,90)),
"gym_water":((170,200,225),(60,100,150),(90,170,140),(40,120,220),(250,220,90)),
"gym_electric":((235,225,140),(110,100,50),(120,180,90),(70,140,200),(255,235,60)),
"gym_grass":((170,215,140),(50,110,60),(60,170,70),(70,140,190),(250,220,90)),
"gym_poison":((190,160,200),(90,50,110),(110,140,110),(110,80,160),(250,220,90)),
"gym_psychic":((235,200,220),(130,80,140),(130,170,150),(100,130,210),(250,220,90)),
"gym_fire":((230,170,130),(130,50,40),(150,160,80),(220,100,50),(255,200,60)),
"gym_ground":((205,175,120),(120,85,50),(140,150,80),(80,130,180),(250,220,90)),
}
assert set(GD.THEMES)<=set(PAL), set(GD.THEMES)-set(PAL)
def sh(c,d): return tuple(max(0,min(255,x+d)) for x in c)
def tile(theme,kind):
    f,w,g,wa,d=PAL[theme]; r=random.Random(__import__("zlib").crc32((theme+kind).encode()))
    im=Image.new("RGBA",(24,24),f+(255,)); dr=ImageDraw.Draw(im)
    if kind=="floor":
        for _ in range(10): x,y=r.randint(0,23),r.randint(0,23); dr.point((x,y),fill=sh(f,-18)+(255,))
    elif kind=="wall":
        im.paste(w+(255,),(0,0,24,24))
        for y in (0,8,16): dr.line([(0,y),(23,y)],fill=sh(w,-40)+(255,))
        for y,off in ((0,6),(8,0),(16,6)):
            for x in range(off,24,12): dr.line([(x,y),(x,y+7)],fill=sh(w,-40)+(255,))
        dr.line([(0,23),(23,23)],fill=sh(w,-60)+(255,))
    elif kind=="grass":
        im.paste(g+(255,),(0,0,24,24))
        for _ in range(9):
            x,y=r.randint(2,21),r.randint(5,22); dr.line([(x,y),(x-1,y-4)],fill=sh(g,35)+(255,)); dr.line([(x,y),(x+1,y-4)],fill=sh(g,-30)+(255,))
    elif kind=="water":
        im.paste(wa+(255,),(0,0,24,24))
        for y in (5,13,20):
            for x in range(0,24,8): dr.arc([x,y,x+8,y+5],200,340,fill=sh(wa,50)+(255,))
    elif kind=="door":
        im.paste(sh(f,-10)+(255,),(0,0,24,24)); dr.rectangle([4,2,19,22],fill=d+(255,),outline=sh(d,-90)+(255,),width=2); dr.ellipse([15,11,17,13],fill=sh(d,-110)+(255,))
    return im
def save(im,path): im.save(path)
files={}
for t in GD.THEMES:
    for k in ("floor","wall","grass","water","door"):
        p=f"{OUT}/tiles/{k}_{t}.png"; save(tile(t,k),p)
# NPC glyphs (1 npc,2 obj,3 switch,4 trainer,5 leader,6 center,7 shop,8 static)
cols={1:(60,120,220),2:(250,215,60),3:(150,150,160),4:(220,60,60),5:(150,60,200),6:(250,130,170),7:(60,180,90),8:(250,150,40)}
for k,c in cols.items():
    im=Image.new("RGBA",(24,24),(0,0,0,0)); dr=ImageDraw.Draw(im)
    if k in(2,3): dr.rectangle([6,6,17,17],fill=c+(255,),outline=(40,40,40,255)); 
    else:
        dr.ellipse([6,2,17,13],fill=(245,215,180,255),outline=(40,40,40,255)); dr.rectangle([6,13,17,22],fill=c+(255,),outline=(40,40,40,255))
    if k==5: dr.polygon([(12,0),(15,4),(9,4)],fill=(255,215,0,255))
    if k==6: dr.rectangle([10,14,13,21],fill=(255,255,255,255)); dr.rectangle([8,16,15,19],fill=(255,255,255,255))
    if k==8: dr.text((9,8),"!",fill=(255,255,255,255))
    save(im,f"{OUT}/ui/npc{k}.png")
im=Image.new("RGBA",(24,24),(0,0,0,0)); dr=ImageDraw.Draw(im); dr.ellipse([4,6,19,21],fill=(255,120,160,255),outline=(40,40,40,255)); dr.polygon([(6,8),(5,1),(10,6)],fill=(255,120,160,255),outline=(40,40,40,255)); dr.polygon([(18,8),(19,1),(14,6)],fill=(255,120,160,255),outline=(40,40,40,255)); dr.point((9,12),fill=(20,20,20,255)); dr.point((15,12),fill=(20,20,20,255)); save(im,f"{OUT}/ui/npc9.png")
im=Image.new("RGBA",(24,24),(0,0,0,0)); dr=ImageDraw.Draw(im); dr.rectangle([6,6,17,17],fill=(80,220,110,255),outline=(20,80,40,255)); dr.rectangle([9,9,14,14],fill=(200,255,210,255)); save(im,f"{OUT}/ui/npc10.png")
im=Image.new("RGBA",(24,24),(0,0,0,0)); dr=ImageDraw.Draw(im); dr.rectangle([6,10,17,20],fill=(230,190,40,255),outline=(60,50,10,255)); dr.arc([8,3,15,12],180,360,fill=(60,50,10,255),width=2); dr.rectangle([11,13,12,17],fill=(60,50,10,255)); save(im,f"{OUT}/ui/npc11.png")
im=Image.new("RGBA",(16,16),(0,0,0,0)); dr=ImageDraw.Draw(im); dr.ellipse([1,1,14,14],fill=(230,50,50,255),outline=(30,30,30,255)); dr.rectangle([1,7,14,8],fill=(30,30,30,255)); dr.ellipse([6,6,9,9],fill=(255,255,255,255),outline=(30,30,30,255)); save(im,f"{OUT}/ui/fx_ball.png")
Image.new("RGBA",(480,270),(255,255,255,170)).save(f"{OUT}/ui/fx_flash.png")
# player dirs 1 down 2 left 3 right 4 up
for d in range(4):
    im=Image.new("RGBA",(24,24),(0,0,0,0)); dr=ImageDraw.Draw(im)
    dr.ellipse([6,2,17,13],fill=(245,215,180,255),outline=(40,40,40,255)); dr.rectangle([6,13,17,22],fill=(220,50,50,255),outline=(40,40,40,255)); dr.rectangle([5,1,18,5],fill=(240,240,240,255),outline=(40,40,40,255))
    eye={0:[(9,8),(14,8)],1:[(8,8)],2:[(15,8)],3:[]}[d]
    for e in eye: dr.point(e,fill=(20,20,20,255)); dr.point((e[0]+1,e[1]),fill=(20,20,20,255))
    save(im,f"{OUT}/ui/player{d+1}_1.png")
    im2=Image.new("RGBA",(24,24),(0,0,0,0)); im2.paste(im,(0,1)); ImageDraw.Draw(im2).rectangle([8,22,10,23],fill=(60,40,40,255)); save(im2,f"{OUT}/ui/player{d+1}_2.png")
# pikachu moods 1 normal 2 happy 3 clue(!)
for m in (1,2,3):
    im=Image.new("RGBA",(24,24),(0,0,0,0)); dr=ImageDraw.Draw(im)
    dr.polygon([(5,10),(3,1),(9,7)],fill=(250,220,40,255),outline=(40,40,40,255)); dr.polygon([(19,10),(21,1),(15,7)],fill=(250,220,40,255),outline=(40,40,40,255))
    dr.polygon([(3,1),(4,4),(5,2)],fill=(30,30,30,255)); dr.polygon([(21,1),(20,4),(19,2)],fill=(30,30,30,255))
    dr.ellipse([4,6,19,21],fill=(250,220,40,255),outline=(40,40,40,255)); dr.ellipse([6,13,9,16],fill=(230,60,50,255)); dr.ellipse([14,13,17,16],fill=(230,60,50,255))
    dr.point((8,10),fill=(20,20,20,255)); dr.point((15,10),fill=(20,20,20,255))
    if m==2: dr.arc([9,12,14,17],20,160,fill=(20,20,20,255))
    if m==3: dr.rectangle([11,-1,12,3],fill=(255,60,60,255)) if False else dr.text((10,0),"!",fill=(255,60,60,255))
    save(im,f"{OUT}/ui/pika{m}_1.png")
    im2=Image.new("RGBA",(24,24),(0,0,0,0)); im2.paste(im,(0,1)); save(im2,f"{OUT}/ui/pika{m}_2.png")
# touch buttons 40x40 translucent
def btn(name,shape):
    im=Image.new("RGBA",(40,40),(0,0,0,0)); dr=ImageDraw.Draw(im); dr.rounded_rectangle([1,1,38,38],8,fill=(30,30,40,150),outline=(255,255,255,200),width=2)
    if shape=="up": dr.polygon([(20,8),(31,28),(9,28)],fill=(255,255,255,230))
    if shape=="down": dr.polygon([(20,32),(31,12),(9,12)],fill=(255,255,255,230))
    if shape=="left": dr.polygon([(8,20),(28,9),(28,31)],fill=(255,255,255,230))
    if shape=="right": dr.polygon([(32,20),(12,9),(12,31)],fill=(255,255,255,230))
    if shape=="ok": dr.ellipse([9,9,31,31],outline=(255,255,255,230),width=3)
    if shape=="pika": dr.ellipse([8,8,32,32],fill=(250,220,40,230)); dr.point((15,18),fill=(20,20,20,255)); dr.point((25,18),fill=(20,20,20,255)); dr.ellipse([11,22,15,26],fill=(230,60,50,255)); dr.ellipse([25,22,29,26],fill=(230,60,50,255))
    if shape=="menu":
        for y in (12,19,26): dr.line([(10,y),(30,y)],fill=(255,255,255,230),width=3)
    save(im.resize((56,56),Image.LANCZOS),f"{OUT}/ui/{name}.png")
for n,s in (("btn_up","up"),("btn_down","down"),("btn_left","left"),("btn_right","right"),("btn_ok","ok"),("btn_menu","menu"),("btn_pika","pika")): btn(n,s)
Image.new("RGBA",(2,2),(0,0,0,0)).save(f"{OUT}/ui/blank.png")
# ---------- original BGM (square-wave chiptune), 8 moods ----------
SR=22050
NOTE={n:440*2**((i-9)/12) for i,n in enumerate(["C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","A#4","B4","C5","C#5","D5","D#5","E5","F5","F#5","G5","G#5","A5"])}
def synth(path,melody,bass,bpm,wave_duty=0.5,vol=0.35):
    beat=60/bpm; samples=[]
    def tone(freq,dur,duty,amp):
        n=int(SR*dur); out=[]
        for i in range(n):
            ph=(i*freq/SR)%1; v=amp if ph<duty else -amp
            env=min(1,i/200)*min(1,(n-i)/400); out.append(v*env)
        return out
    mel=[]
    for note,b in melody: mel+= tone(NOTE[note],b*beat,wave_duty,vol) if note else [0]*int(SR*b*beat)
    bas=[]
    for note,b in bass: bas+= tone(NOTE[note]/2,b*beat,0.25,vol*0.6) if note else [0]*int(SR*b*beat)
    n=max(len(mel),len(bas)); mel+= [0]*(n-len(mel)); bas+= [0]*(n-len(bas))
    with wave.open(path,"wb") as w:
        w.setnchannels(1); w.setsampwidth(1); w.setframerate(SR)
        w.writeframes(bytes(int(128+127*max(-1,min(1,a+b))) for a,b in zip(mel,bas)))
M={ # mood -> (melody, bass, bpm, duty)
1:([("C5",1),("E5",1),("G5",1),("E5",1),("A5",1),("G5",1),("E5",1),("D5",1),("C5",1),("E5",1),("G5",1),("C5",1),("D5",2),("E5",2)],[("C4",4),("F4",4),("G4",4),("C4",4)],110,0.5),
2:([("E4",1),("G4",1),("A4",1),("G4",1),("E4",1),("D4",1),("C4",2),("D4",1),("E4",1),("G4",1),("A4",1),("C5",2),("A4",2)],[("A4",4),("G4",4),("E4",4),("A4",4)],120,0.25),
3:([("G4",.5),("A4",.5),("B4",.5),("D5",.5),("B4",.5),("A4",.5),("G4",1),("E4",.5),("G4",.5),("A4",1),("G4",2)],[("G4",2),("D4",2),("G4",2),("E4",2)],130,0.5),
4:([("A4",.5),("A4",.5),("C5",.5),("A4",.5),("D5",.5),("A4",.5),("E5",1),("D5",.5),("C5",.5),("A4",1),("G4",1)],[("A4",1),("A4",1),("F4",1),("G4",1)]*2,150,0.5),
5:([("E5",.5),("D#5",.5),("E5",.5),("B4",.5),("D5",.5),("C5",.5),("A4",1),("C4",.5),("E4",.5),("A4",1),("B4",1)],[("A4",2),("E4",2),("A4",2),("E4",2)],160,0.25),
6:([("D4",1),("D#4",1),("D4",1),("A4",1),("G4",1),("F#4",1),("D4",2),("D#4",1),("D4",1),("A4",2)],[("D4",2),("D4",2),("G4",2),("A4",2)],100,0.125),
7:([("C5",.5),("E5",.5),("G5",1),("A5",.5),("G5",.5),("E5",1),("D5",.5),("E5",.5),("C5",1),("G4",1),("C5",2)],[("C4",2),("G4",2),("A4",2),("F4",2)],140,0.5),
8:([("C5",2),("E5",2),("G5",2),("A5",2),("G5",2),("E5",2),("D5",2),("C5",4)],[("C4",4),("F4",4),("G4",4),("C4",4)],70,0.5)}
for k,(mel,bas,bpm,duty) in M.items():
    wp=f"{OUT}/bgm/bgm{k}.wav"; synth(wp,mel,bas,bpm,duty)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",wp,"-ac","1","-b:a","48k",f"{OUT}/bgm/bgm{k}.mp3"],check=True); os.remove(wp)
print("assets ok", sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fs in os.walk(OUT) for f in fs)//1024,"KB")

# 24px species icons for visible wild Pokemon (downscaled from the 96px front sprites; NOT directional walk art)
os.makedirs(OUT+"/icons",exist_ok=True)
for i in range(1,152):
    im=Image.open(f"assets/sprites/{i:03d}.png").convert("RGBA"); bb=im.getbbox() or (0,0,96,96); im=im.crop(bb); im.thumbnail((24,24),Image.LANCZOS)
    c=Image.new("RGBA",(24,24),(0,0,0,0)); c.paste(im,((24-im.width)//2,(24-im.height)//2)); c.save(f"{OUT}/icons/{i:03d}.png")

# derived left/right + 2-frame bob variants of the wild icons (mirror of the front sprite; NOT original walk art)
from PIL import ImageOps
for i in range(1,152):
    base=Image.open(f"{OUT}/icons/{i:03d}.png")
    for var in range(4):
        im=ImageOps.mirror(base) if var<2 else base.copy()
        if var%2==1:
            c=Image.new("RGBA",(24,24),(0,0,0,0)); c.paste(im,(0,1)); im=c
        im.save(f"{OUT}/icons/{i:03d}_{var}.png")
