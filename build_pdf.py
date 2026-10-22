from pathlib import Path
from textwrap import fill
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Circle
from matplotlib.backends.backend_pdf import PdfPages

ROOT=Path(__file__).resolve().parent
A=ROOT/'assets'
OUT=ROOT/'brand-strategy.pdf'
W,H=13.333,7.5
INK='#0A0C10'; INK2='#11151B'; PANEL='#171C24'; PANEL2='#202630'; PAPER='#F3F3F0'; WHITE='#F5F6F7'; MUTED='#A0A7B1'; SILVER='#C4C9D1'; RED='#B51F35'; LINE='#333943'; GREY='#59616C'
SANS='DejaVu Sans'; SERIF='DejaVu Serif'

plt.rcParams['pdf.fonttype']=42
plt.rcParams['ps.fonttype']=42
plt.rcParams['font.family']=SANS


def page(bg=INK):
    fig=plt.figure(figsize=(W,H),facecolor=bg)
    ax=fig.add_axes([0,0,1,1]); ax.set_xlim(0,1); ax.set_ylim(0,1); ax.axis('off')
    ax.set_facecolor(bg)
    return fig,ax

def box(ax,x,y,w,h,color,alpha=1,edge=None,lw=0.7,rounding=0):
    if rounding:
        p=FancyBboxPatch((x,y),w,h,boxstyle=f'round,pad=0,rounding_size={rounding}',facecolor=color,edgecolor=edge or color,linewidth=lw,alpha=alpha,transform=ax.transAxes)
    else:
        p=Rectangle((x,y),w,h,facecolor=color,edgecolor=edge or color,linewidth=lw,alpha=alpha,transform=ax.transAxes)
    ax.add_patch(p)

def txt(ax,x,y,s,size=12,color=WHITE,weight='normal',family=SANS,ha='left',va='top',linespacing=1.22,alpha=1,rotation=0):
    ax.text(x,y,s,transform=ax.transAxes,fontsize=size,color=color,fontweight=weight,fontfamily=family,ha=ha,va=va,linespacing=linespacing,alpha=alpha,rotation=rotation)

def paragraph(ax,x,y,s,width=52,size=11,color=MUTED,weight='normal',family=SANS,linespacing=1.34):
    wrapped='\n'.join(fill(line,width=width,break_long_words=False,break_on_hyphens=False) if line else '' for line in s.split('\n'))
    txt(ax,x,y,wrapped,size=size,color=color,weight=weight,family=family,linespacing=linespacing)
    return wrapped.count('\n')+1

def label(ax,x,y,s,color=RED,size=8):
    txt(ax,x,y,s.upper(),size=size,color=color,weight='bold')

def rule(ax,x,y,w,color=LINE,lw=1):
    ax.plot([x,x+w],[y,y],transform=ax.transAxes,color=color,lw=lw,solid_capstyle='butt')

def vline(ax,x,y,h,color=LINE,lw=.7):
    ax.plot([x,x],[y,y+h],transform=ax.transAxes,color=color,lw=lw,solid_capstyle='butt')

def image_cover(ax,path,x,y,w,h,focus=(.5,.5)):
    im=Image.open(path).convert('RGB')
    iw,ih=im.size; ar=w/h; iar=iw/ih
    if iar>ar:
        nw=int(ih*ar); left=int((iw-nw)*focus[0]); left=max(0,min(iw-nw,left)); im=im.crop((left,0,left+nw,ih))
    else:
        nh=int(iw/ar); top=int((ih-nh)*focus[1]); top=max(0,min(ih-nh,top)); im=im.crop((0,top,iw,top+nh))
    ax.imshow(im,extent=(x,x+w,y,y+h),aspect='auto',zorder=0)

def logo(ax,x,y,w,h,alpha=1):
    im=Image.open(A/'logo-symbol.png').convert('RGBA')
    ax.imshow(im,extent=(x,x+w,y,y+h),aspect='auto',zorder=3,alpha=alpha)

def footer(ax,n,total=24,dark=True):
    color='#89919D' if dark else '#717983'
    rule(ax,.055,.055,.89,color='#303640' if dark else '#D2D4D3',lw=.6)
    txt(ax,.056,.038,'SIYAVIKELA SECURITY SERVICES  /  BRAND STRATEGY · 2026',size=6.6,color=color,weight='bold',va='bottom')
    txt(ax,.944,.038,f'{n:02d}  /  {total:02d}',size=6.8,color=color,weight='bold',ha='right',va='bottom')

def title(ax,kicker,headline,sub=None,x=.06,y=.91,color=WHITE,headsize=34,maxw=0.86):
    label(ax,x,y,kicker)
    txt(ax,x,y-.055,headline,size=headsize,color=color,weight='bold',linespacing=1.04)
    if sub:
        paragraph(ax,x,y-.18,sub,width=86,size=10.8,color=MUTED if color==WHITE else GREY)

def add_card(ax,x,y,w,h,head,body,num=None,accent=RED,dark=True):
    bg=PANEL if dark else '#FFFFFF'; fg=WHITE if dark else '#15191F'; muted=MUTED if dark else '#5B636D'
    box(ax,x,y,w,h,bg,edge=LINE if dark else '#D8DADA',lw=.65)
    if num: label(ax,x+.025,y+h-.04,num,accent,size=7)
    txt(ax,x+.025,y+h-.105,head,size=12.2,color=fg,weight='bold',linespacing=1.07)
    paragraph(ax,x+.025,y+h-.17,body,width=max(22,int(67*w)),size=8.3,color=muted,linespacing=1.25)

def save(pdf,fig):
    pdf.savefig(fig,facecolor=fig.get_facecolor(),bbox_inches=None,pad_inches=0)
    plt.close(fig)

with PdfPages(OUT) as pdf:
    # 01 cover
    fig,ax=page(INK)
    image_cover(ax,A/'hero-dobsonville.jpg',0,0,1,1,focus=(.4,.5))
    box(ax,0,0,1,1,'#05070A',.60)
    # additional left overlay for contrast
    box(ax,0,0,.58,1,'#06080C',.42)
    logo(ax,.065,.72,.075,.11,alpha=.95)
    label(ax,.065,.67,'Brand development & strategic positioning',color='#D3D8DF',size=7.7)
    txt(ax,.065,.58,'SIYAVIKELA',size=49,color=WHITE,weight='bold')
    txt(ax,.065,.51,'SECURITY SERVICES',size=12,color='#D5D9DE',weight='bold')
    rule(ax,.065,.47,.075,RED,lw=2)
    txt(ax,.065,.39,'Protection',size=41,color=WHITE,weight='bold')
    txt(ax,.065,.33,'that connects.',size=37,color='#D1D6DD',weight='normal',family=SERIF)
    paragraph(ax,.065,.245,'Professional protection. Transparent service. Community accountability.',width=57,size=12,color='#D8DCE2')
    txt(ax,.065,.095,'DOBSONVILLE · SOWETO · GAUTENG',size=8,color='#D1D5DC',weight='bold')
    txt(ax,.94,.095,'STRATEGIC CONCEPT  /  OCTOBER 2026',size=7,color='#D1D5DC',weight='bold',ha='right')
    save(pdf,fig)

    # 02 overview
    fig,ax=page(INK)
    title(ax,'STRATEGIC OVERVIEW','A local security brand,\nbuilt for lasting trust.','Six connected phases turn a community-rooted proposal into a professional, accountable brand and service model.',headsize=31)
    phases=[('01','FOUNDATION','Define purpose, services, community and readiness.'),('02','POSITIONING','Clarify why clients should trust and choose Siyavikela.'),('03','BRAND STRATEGY','Set the promise, values, personality and voice.'),('04','CORPORATE IDENTITY','Systemise logo, colour, typography and applications.'),('05','SERVICE EXPERIENCE','Make the promise tangible in every interaction.'),('06','GROWTH & PARTNERSHIPS','Validate demand, compliance, economics and scale.')]
    for i,(n,h,b) in enumerate(phases):
        col=i%3; row=i//3; x=.06+col*.30; y=.46-row*.24
        add_card(ax,x,y,.275,.205,h,b,num=n)
    box(ax,.06,.11,.88,.09,'#171C24')
    txt(ax,.085,.16,'THE STRATEGIC PRINCIPLE',size=8,color=RED,weight='bold',va='center')
    txt(ax,.32,.16,'Build trust before scale. Establish compliance before launch.',size=13,color=WHITE,weight='bold',va='center')
    footer(ax,2); save(pdf,fig)

    # 03 local opportunity
    fig,ax=page(INK)
    image_cover(ax,A/'community-dobsonville.jpg',0,0,.49,1,focus=(.46,.5))
    box(ax,.49,0,.51,1,INK)
    label(ax,.55,.91,'01 / Foundation · the opportunity')
    txt(ax,.55,.84,'A safer community\nstarts with a\nconnected system.',size=29,color=WHITE,weight='bold',linespacing=1.03)
    paragraph(ax,.55,.60,'The supplied proposal identifies concerns in Dobsonville: house robberies and break-ins; dark streets and malfunctioning lights; hotspots associated with illegal dumping; communication gaps; and a need for a visible local presence.',width=47,size=9.4,color=MUTED)
    rule(ax,.55,.405,.38,color=LINE)
    label(ax,.55,.37,'Starting assumptions · validate before use')
    txt(ax,.55,.31,'33',size=33,color=WHITE,weight='bold')
    txt(ax,.67,.325,'people noted at the 5 August 2026 meeting',size=8.5,color=MUTED)
    txt(ax,.55,.235,'180–200',size=28,color=WHITE,weight='bold')
    txt(ax,.77,.25,'estimated households in the proposed target area',size=8.5,color=MUTED)
    paragraph(ax,.55,.15,'These figures are supplied-proposal inputs, not independently verified market research. Confirm area boundaries, household counts and service demand through a survey.',width=53,size=7.5,color='#8E96A1')
    txt(ax,.035,.07,'ILLUSTRATIVE COMMUNITY VISUAL',size=6.6,color='#E0E3E7',weight='bold')
    footer(ax,3); save(pdf,fig)

    # 04 purpose mission vision
    fig,ax=page(INK)
    title(ax,'01 / FOUNDATION','Define the reason to exist.','A community-rooted security company must make its purpose visible through lawful operations, reliable communication and documented service.',headsize=32)
    y=.46; h=.35; gap=.018; x0=.06; cw=.282
    cards=[('PURPOSE','Help create safer communities by providing professional, accountable security services that respond to local needs and protect people, property and peace of mind.'),('MISSION','Protect people, property and digital environments through trusted local expertise, appropriate technology and professional integrated security solutions—building safer communities today and a trusted company for tomorrow.'),('VISION','Safer communities. Protected assets. Secure digital futures.')]
    for i,(a,b) in enumerate(cards):
        x=x0+i*(cw+gap); box(ax,x,y,cw,h,PANEL,edge=LINE)
        label(ax,x+.024,y+h-.045,a)
        paragraph(ax,x+.024,y+h-.11,b,width=41,size=10,color=WHITE,weight='normal',linespacing=1.4)
    box(ax,.06,.16,.88,.12,'#171C24')
    label(ax,.085,.235,'Operating principle')
    txt(ax,.085,.195,'Protection must be experienced, not merely promised.',size=17,color=WHITE,weight='bold')
    paragraph(ax,.085,.135,'Translate every promise into a defined service, trained people, a clear escalation process and a transparent client agreement.',width=105,size=8.2,color=MUTED)
    footer(ax,4); save(pdf,fig)

    # 05 operating model
    fig,ax=page(INK)
    title(ax,'01 / FOUNDATION','One operating philosophy. Four service pillars.','The service architecture should support growth while staying clear enough for customers to understand.',headsize=31)
    steps=[('01','UNDERSTAND','Assess need, risk and requirements.'),('02','PREPARE','Define compliant people, tools and procedures.'),('03','CONNECT','Coordinate with clients and safety partners.'),('04','PROTECT','Deliver the agreed authorised service.'),('05','ACCOUNT','Record, communicate and report.'),('06','IMPROVE','Use feedback and evidence to learn.')]
    for i,(n,h,b) in enumerate(steps):
        x=.06+i*.148
        box(ax,x,.57,.135,.19,PANEL,edge=LINE)
        label(ax,x+.014,.72,n)
        txt(ax,x+.014,.665,h,size=9,color=WHITE,weight='bold')
        paragraph(ax,x+.014,.61,b,width=20,size=7.1,color=MUTED)
    pillars=[('PHYSICAL SECURITY','Guarding, residential and commercial security, patrol and authorised response.'),('ELECTRONIC SECURITY','Alarms, panic alerts, CCTV and access monitoring.'),('TRACKING & PERSONAL SAFETY','Potential vehicle tracking and personal safety devices.'),('COMMUNITY COORDINATION','Structured reporting and appropriate safety collaboration.')]
    for i,(h,b) in enumerate(pillars):
        x=.06+(i%2)*.455; y=.35-(i//2)*.15
        add_card(ax,x,y,.425,.125,h,b,num=f'0{i+1}',dark=True)
    paragraph(ax,.06,.12,'Important: these are strategic categories—not confirmation that each service is currently operational. Offer only what is authorised, equipped, staffed and supported by clear procedures.',width=105,size=7.5,color='#A2A9B3')
    footer(ax,5); save(pdf,fig)

    # 06 audience team ecosystem
    fig,ax=page(INK)
    title(ax,'01 / FOUNDATION','Built from within the community.','Dobsonville is the proposed first focus; expansion should follow evidence, capability and compliance.',headsize=31)
    groups=[('PRIMARY','Residents & households','Clear service options, practical information and a way to raise concerns.'),('SECONDARY','Local businesses','Protection aligned to premises, operating hours and commercial risk.'),('INSTITUTIONAL','Schools & organisations','Potential safety cooperation with agreed scope and safeguarding.'),('FUTURE','Property & fleet clients','New markets only when the operating model can support them.')]
    for i,(n,h,b) in enumerate(groups):
        x=.06+i*.225
        add_card(ax,x,.55,.205,.21,h,b,num=n)
    label(ax,.06,.45,'Partner ecosystem')
    ecosystem=['RESIDENTS','SAPS / CPF','SCHOOLS','BUSINESSES','TECHNOLOGY','SECURITY PARTNERS']
    for i,s in enumerate(ecosystem):
        x=.06+i*.15
        box(ax,x,.365,.135,.055,'#202630',edge='#3A414B')
        txt(ax,x+.0675,.392,s,size=6.5,color=WHITE,weight='bold',ha='center',va='center')
    rule(ax,.06,.33,.88,color=LINE)
    label(ax,.06,.29,'Founding contributors · roles and credentials to verify')
    names=[('Thato Radise','Marketing, community engagement, business development & partnerships'),('Tendi Matloha','Proposed vehicle tracking and security operations; verify PSiRA status'),('Andile Dambuza','Security operational development; verify PSiRA status'),('Papi Raborife','Technology, innovation, service and brand development')]
    for i,(n,b) in enumerate(names):
        col=i%2; row=i//2; x=.06+col*.455; y=.235-row*.09
        txt(ax,x,y,n,size=9,color=WHITE,weight='bold')
        paragraph(ax,x,y-.025,b,width=59,size=7.3,color=MUTED)
    txt(ax,.06,.065,'The supplied proposal separately identifies two CIPC-registered directors. Verify official records, appointments and public role descriptions before release.',size=7,color='#8C949F')
    footer(ax,6); save(pdf,fig)

    # 07 positioning with street
    fig,ax=page(INK)
    image_cover(ax,A/'dobsonville-street.jpg',0,0,1,1,focus=(.5,.5))
    box(ax,0,0,1,1,'#07090C',.71)
    label(ax,.065,.91,'02 / Positioning')
    txt(ax,.065,.82,'PROFESSIONAL\nPROTECTION.',size=34,color=WHITE,weight='bold',linespacing=1.0)
    txt(ax,.065,.68,'ROOTED IN\nCOMMUNITY.',size=32,color='#D1D6DD',weight='normal',family=SERIF,linespacing=1.05)
    rule(ax,.065,.58,.075,RED,lw=2)
    paragraph(ax,.065,.52,'For households, businesses and institutions seeking dependable security, Siyavikela aims to combine local understanding, coordinated communication and appropriate technology with transparent service.',width=65,size=11,color='#E1E4E9')
    # differentiators on right
    items=[('LOCAL PRESENCE','Informed by real community concerns.'),('COORDINATED OPERATIONS','Clear reporting, escalation and follow-through.'),('APPROPRIATE TECHNOLOGY','Tools selected for need, cost and capability.'),('TRANSPARENT SERVICE','Agreed scope, honest claims and documented performance.')]
    for i,(h,b) in enumerate(items):
        y=.83-i*.145
        box(ax,.63,y-.09,.305,.105,'#11151B',.84,edge='#454C55',lw=.5)
        label(ax,.65,y-.015,f'0{i+1} / {h}',size=6.4)
        paragraph(ax,.65,y-.042,b,width=37,size=7.2,color='#D3D8DF')
    txt(ax,.065,.075,'LOCAL-INSPIRED VISUALISATION · NOT DOCUMENTARY EVIDENCE',size=6.5,color='#E0E3E7',weight='bold')
    footer(ax,7); save(pdf,fig)

    # 08 brand proposition and promise
    fig,ax=page(INK)
    title(ax,'02–03 / POSITIONING & BRAND','A promise with three clear expectations.','A strong brand is useful to clients only when it can be demonstrated in service delivery.',headsize=31)
    blocks=[('PROFESSIONAL PROTECTION','Services delivered by appropriately qualified personnel under required authorisations and procedures.'),('TRANSPARENT SERVICE','Clients understand what is included, what it costs and how incidents are handled.'),('COMMUNITY ACCOUNTABILITY','Listen to feedback, explain responsibilities and report on agreed service delivery.')]
    for i,(h,b) in enumerate(blocks):
        x=.06+i*.30
        box(ax,x,.55,.275,.21,PANEL,edge=LINE)
        label(ax,x+.022,.72,f'0{i+1} / {h}')
        paragraph(ax,x+.022,.66,b,width=40,size=9,color=WHITE,linespacing=1.35)
    label(ax,.06,.45,'The brand territory')
    txt(ax,.06,.39,'PROTECTION THAT CONNECTS.',size=25,color=WHITE,weight='bold')
    paragraph(ax,.06,.32,'Connect people to information, clients to response arrangements, security operations to appropriate technology and communities to relevant safety partners.',width=90,size=9.5,color=MUTED)
    rule(ax,.06,.24,.88,color=LINE)
    add_card(ax,.06,.09,.275,.115,'FOR RESIDENTS','Clear options, service limits and a participation route.',num='VALUE')
    add_card(ax,.36,.09,.275,.115,'FOR BUSINESSES','A risk-aligned scope and agreed service standards.',num='VALUE')
    add_card(ax,.66,.09,.275,.115,'FOR PARTNERS','Clear roles, lawful cooperation and reliable communication.',num='VALUE')
    footer(ax,8); save(pdf,fig)

    # 09 personality values tone
    fig,ax=page(INK)
    title(ax,'03 / BRAND STRATEGY','Reassurance through professionalism—not fear.','A brand voice should be confident, trustworthy, observant, organised, respectful and open to useful innovation.',headsize=30)
    vals=[('INTEGRITY','Honest, lawful and responsible.'),('VIGILANCE','Prepared and aware of responsibility.'),('COMMUNITY','Respectful and approachable.'),('ACCOUNTABILITY','Document, communicate, own the service.'),('INNOVATION','Useful tools, privacy respected.')]
    for i,(h,b) in enumerate(vals):
        y=.70-i*.095
        rule(ax,.06,y,.40,color=LINE,lw=.8)
        label(ax,.06,y-.02,f'0{i+1} / {h}',size=7)
        txt(ax,.235,y-.022,b,size=8.2,color=WHITE)
    box(ax,.54,.48,.40,.265,PANEL,edge=LINE)
    label(ax,.57,.70,'TONE OF VOICE')
    paragraph(ax,.57,.65,'Instead of: “We guarantee your safety.”\n\nSay: “We deliver the agreed security services and communicate clearly about our responsibilities.”',width=50,size=9,color=WHITE,linespacing=1.45)
    box(ax,.54,.15,.40,.265,PANEL,edge=LINE)
    label(ax,.57,.37,'BRAND STORY')
    paragraph(ax,.57,.32,'Challenge: security concerns and communication gaps.\nInsight: local knowledge needs systems and capability.\nResponse: connect people, process and technology.\nAmbition: earn trust through service quality.',width=50,size=8.5,color=MUTED,linespacing=1.4)
    txt(ax,.06,.12,'COMMUNITY LINE  /  Protecting our homes. Strengthening our community.',size=10,color='#CDD2D9',weight='bold')
    footer(ax,9); save(pdf,fig)

    # 10 logo system
    fig,ax=page(INK)
    title(ax,'04 / CORPORATE IDENTITY','The existing mark already has a point of view.','Retain the shield-and-eye recognition, then prepare a practical, production-ready system.',headsize=30)
    box(ax,.06,.20,.41,.55,'#11151B',edge='#2D333D')
    logo(ax,.13,.235,.27,.48,alpha=1)
    label(ax,.55,.70,'Visual meaning')
    meanings=[('SHIELD','Protection and defence.'),('EYE','Vigilance and awareness.'),('RED CENTRE','Alertness and focus.'),('SILVER / WHITE','Clarity, precision and professionalism.')]
    for i,(h,b) in enumerate(meanings):
        y=.62-i*.105
        label(ax,.55,y,h,size=7)
        txt(ax,.72,y,b,size=8.4,color=WHITE)
    rule(ax,.55,.205,.39,color=LINE)
    paragraph(ax,.55,.17,'Prepare primary colour, reversed white, single-colour, symbol-only, horizontal lock-up and compact digital versions. Provisional clear space: ¼ shield height. Starting minimum: symbol 24 px / 12 mm; full lock-up 160 px / 38 mm. Test embroidery, vehicle graphics, print and small-screen use.',width=61,size=7.7,color=MUTED)
    footer(ax,10); save(pdf,fig)

    # 11 CI system
    fig,ax=page(PAPER)
    label(ax,.06,.91,'04 / Corporate identity · proposed working system',color=RED)
    txt(ax,.06,.84,'A disciplined visual language.',size=30,color='#11151A',weight='bold')
    paragraph(ax,.06,.765,'Working values inferred from the supplied visual direction. Confirm against vector master artwork and test for print reproduction and accessible contrast.',width=104,size=9.2,color=GREY)
    swatches=[('#171B23','MIDNIGHT CHARCOAL','Primary backgrounds, uniforms and digital layouts.','23 / 27 / 35','35 / 23 / 0 / 86'),('#B51F35','ALERT RED','Accents, alerts and calls to action.','181 / 31 / 53','0 / 83 / 71 / 29'),('#C4C9D1','SECURITY SILVER','Supporting surfaces, borders and diagrams.','196 / 201 / 209','6 / 4 / 0 / 18'),('#FFFFFF','CLEAN WHITE','Body copy, documents and contrast.','255 / 255 / 255','0 / 0 / 0 / 0')]
    for i,(c,h,b,rgb,cmyk) in enumerate(swatches):
        x=.06+i*.225
        box(ax,x,.50,.205,.19,c,edge='#D1D3D3' if c=='#FFFFFF' else c)
        fg='#15191E' if c in ['#C4C9D1','#FFFFFF'] else WHITE
        txt(ax,x+.014,.665,h,size=6.3,color=fg,weight='bold')
        txt(ax,x+.014,.575,c,size=9.4,color=fg,weight='bold',va='bottom')
        txt(ax,x+.014,.545,f'RGB {rgb}',size=5.1,color=fg,weight='normal',va='bottom')
        txt(ax,x+.014,.521,f'CMYK ≈ {cmyk}',size=5.0,color=fg,weight='normal',va='bottom')
        paragraph(ax,x,.47,b,width=33,size=6.9,color=GREY)
    rule(ax,.06,.355,.88,color='#C9CCCD')
    label(ax,.06,.315,'Typography & accessibility',color=RED)
    txt(ax,.06,.26,'BOLD MODERN SANS',size=15,color='#11151A',weight='bold')
    txt(ax,.38,.26,'Manrope / Inter; Arial fallback · headlines 600–700',size=8,color=GREY)
    txt(ax,.06,.195,'LEGIBLE SANS',size=14,color='#11151A',weight='normal')
    txt(ax,.38,.195,'16 px web minimum · 9 pt print · 1.5 line height',size=8,color=GREY)
    txt(ax,.06,.12,'Suggested balance: 60% charcoal / 25% silver-white / 10% white space / 5% red. Approximate CMYK; proof to printer profile.',size=6.6,color=GREY)
    txt(ax,.06,.085,'Photography: respectful local context, no fear-based styling or unapproved marks; label every concept mock-up.',size=6.3,color=GREY)
    footer(ax,11,dark=False); save(pdf,fig)

    # 12 vehicle mockup
    fig,ax=page(INK)
    image_cover(ax,A/'vehicle-branded.jpg',.40,0,.60,1,focus=(.53,.53))
    box(ax,.40,0,.60,1,'#0A0C10',.16)
    box(ax,0,0,.42,1,INK)
    label(ax,.06,.90,'04 / Application · vehicle concept')
    txt(ax,.06,.81,'Visible,\nunderstated,\nprofessional.',size=28,color=WHITE,weight='bold',linespacing=1.04)
    paragraph(ax,.06,.57,'Use a charcoal or neutral base, a clear shield-and-wordmark lock-up and a restrained red signal line. Vehicle graphics should identify the actual service without implying police authority.',width=44,size=9.1,color=MUTED)
    label(ax,.06,.37,'Rules before deployment')
    bullets=['Brand only vehicles authorised for the service.','Use verified contact details only.','No false police markings, blue lights or unsupported response claims.','Test legibility at distance and in low light.']
    for i,b in enumerate(bullets):
        txt(ax,.07,.32-i*.047,'•  '+b,size=7.8,color=WHITE)
    txt(ax,.43,.09,'CONCEPT BRANDING MOCK-UP · NOT AN OPERATING FLEET CLAIM',size=6.5,color='#E3E6EA',weight='bold')
    footer(ax,12); save(pdf,fig)

    # 13 electronic security
    fig,ax=page(INK)
    image_cover(ax,A/'home-technology.jpg',0,.18,.56,.82,focus=(.52,.5))
    box(ax,.56,.18,.44,.82,INK)
    label(ax,.61,.87,'04 / Service application · electronic security')
    txt(ax,.61,.77,'Technology\nwith a clear\nuse case.',size=28,color=WHITE,weight='bold',linespacing=1.03)
    paragraph(ax,.61,.54,'Potential alarms, panic alerts, access monitoring and CCTV solutions. Select equipment around need, affordability, support and reliability—not novelty.',width=42,size=8.7,color=MUTED)
    items=[('CAPABILITY','What will the product actually do?'),('COST','Purchase, rental, installation and ongoing fees?'),('PRIVACY','What information is collected and who can access it?'),('SUPPORT','Who maintains, repairs and responds to faults?')]
    for i,(h,b) in enumerate(items):
        y=.37-i*.072
        label(ax,.61,y,h,size=6.5)
        txt(ax,.75,y,b,size=7.2,color=WHITE)
    txt(ax,.035,.095,'INSTALLATION / CLIENT CONVERSATION CONCEPT',size=6.2,color='#E0E3E7',weight='bold')
    footer(ax,13); save(pdf,fig)

    # 14 tracking & drone
    fig,ax=page(INK)
    image_cover(ax,A/'drone-soweto.jpg',0,.39,1,.61,focus=(.5,.5))
    box(ax,0,.39,1,.61,'#05070B',.25)
    label(ax,.06,.91,'04 / Tracking & personal safety')
    txt(ax,.06,.82,'Useful tools.\nResponsible deployment.',size=29,color=WHITE,weight='bold',linespacing=1.04)
    box(ax,.06,.11,.88,.22,'#11151B',.96,edge='#353B45')
    paragraph(ax,.085,.285,'Potential vehicle tracking and personal safety devices should be separately scoped, priced and supported. Drone imagery is conceptual only: any real operation requires applicable aviation, privacy, site and operational permissions.',width=128,size=8.1,color='#D7DBE1')
    footer(ax,14); save(pdf,fig)

    # 15 operations and incidents
    fig,ax=page(INK)
    image_cover(ax,A/'operations-room.jpg',.48,0,.52,1,focus=(.5,.48))
    box(ax,0,0,.50,1,INK)
    label(ax,.06,.91,'05 / Service experience · incident communication')
    txt(ax,.06,.81,'Clear communication\nis part of protection.',size=27,color=WHITE,weight='bold',linespacing=1.06)
    flow=['INCIDENT REPORTED','RECORD & ASSESS','ESCALATE APPROPRIATELY','COORDINATE AUTHORISED RESPONSE','UPDATE CLIENT AS AGREED','DOCUMENT & REVIEW']
    for i,s in enumerate(flow):
        y=.62-i*.075
        box(ax,.06,y-.04,.37,.052,PANEL,edge=LINE)
        label(ax,.075,y-.005,f'{i+1:02d}',size=6.5)
        txt(ax,.125,y-.005,s,size=7.2,color=WHITE,weight='bold',va='center')
    paragraph(ax,.06,.125,'Coverage hours, staffing, channels and escalation rules must be defined before the service is offered. Emergency incidents must be directed to the appropriate service; Siyavikela is not a substitute for SAPS or emergency medical services.',width=65,size=7.4,color=MUTED)
    footer(ax,15); save(pdf,fig)

    # 16 uniform
    fig,ax=page(INK)
    image_cover(ax,A/'uniform-branded.jpg',0,0,.63,1,focus=(.62,.5))
    box(ax,0,0,.63,1,'#0A0C10',.16)
    box(ax,.63,0,.37,1,INK)
    label(ax,.68,.90,'04 / Application · uniform')
    txt(ax,.68,.81,'Professional.\nRecognisable.\nApproachable.',size=25,color=WHITE,weight='bold',linespacing=1.04)
    paragraph(ax,.68,.57,'Concept direction: clean charcoal uniform, subtle red piping and a legible shield patch. The design should create confidence, not an unnecessarily militaristic impression.',width=38,size=8.2,color=MUTED)
    label(ax,.68,.38,'Uniform system')
    for i,b in enumerate(['Embroidery at a legible size.','Verified identification and role.','High-visibility apparel where appropriate.','Review applicable industry requirements.']):
        txt(ax,.68,.34-i*.052,'•  '+b,size=7.2,color=WHITE)
    txt(ax,.04,.07,'ILLUSTRATIVE UNIFORM MOCK-UP · NOT AN ISSUED UNIFORM',size=6.2,color='#E0E3E7',weight='bold')
    footer(ax,16); save(pdf,fig)

    # 17 equipment and collateral
    fig,ax=page(INK)
    image_cover(ax,A/'equipment-branded.jpg',0,.41,.62,.59,focus=(.47,.55))
    box(ax,.62,.41,.38,.59,INK)
    label(ax,.67,.90,'04 / Applications · equipment & stationery')
    txt(ax,.67,.81,'One system,\nacross the kit.',size=25,color=WHITE,weight='bold')
    paragraph(ax,.67,.66,'Radio, phone, panic button, light, sensors and camera are concept items only. Choose equipment against a defined use, training, support and privacy process.',width=38,size=8.1,color=MUTED)
    # stationery cards
    box(ax,.06,.105,.40,.235,'#F3F3F0',edge='#D4D7D8')
    logo(ax,.085,.22,.055,.09)
    txt(ax,.15,.285,'SIYAVIKELA',size=8.5,color='#15191E',weight='bold')
    txt(ax,.15,.26,'SECURITY SERVICES',size=5.7,color='#606872',weight='bold')
    txt(ax,.085,.18,'CLIENT PROPOSAL  /  INCIDENT FORM  /  SERVICE REPORT',size=6.2,color='#434B55',weight='bold')
    rule(ax,.085,.157,.31,color=RED,lw=1.4)
    txt(ax,.085,.125,'Operational documents are part of the identity.',size=6.5,color='#616973')
    box(ax,.51,.105,.43,.235,'#171C24',edge='#353B45')
    label(ax,.535,.30,'DIGITAL & IDENTIFICATION',size=6.2)
    txt(ax,.535,.245,'Website · Email · Staff ID',size=10,color=WHITE,weight='bold')
    paragraph(ax,.535,.205,'Use verified details; separate current services from planned services.',width=48,size=7.1,color=MUTED)
    txt(ax,.04,.075,'EQUIPMENT AND STATIONERY VISUALS ARE ILLUSTRATIVE CONCEPT MOCK-UPS.',size=6,color='#E0E3E7',weight='bold')
    footer(ax,17); save(pdf,fig)

    # 18 community/business experience
    fig,ax=page(INK)
    image_cover(ax,A/'soweto-business.jpg',0,.39,1,.61,focus=(.58,.5))
    box(ax,0,.39,1,.61,'#07090C',.34)
    label(ax,.06,.91,'05 / Brand & service experience')
    txt(ax,.06,.82,'Good security respects\nits community.',size=27,color=WHITE,weight='bold',linespacing=1.03)
    box(ax,.06,.08,.88,.26,'#11151B',.97,edge='#343A44')
    items=[('RESIDENTS','Listen, assess, explain, enrol, deliver, communicate, review.'),('BUSINESSES','Discover, assess risk, propose, agree, implement, review.'),('SCHOOLS','Agree scope with management; put safeguarding first.'),('PARTNERS','Coordinate within each organisation’s lawful role.')]
    for i,(h,b) in enumerate(items):
        x=.085+(i%2)*.42; y=.295-(i//2)*.105
        label(ax,x,y,h,size=6.7)
        paragraph(ax,x,y-.025,b,width=56,size=7.3,color='#D5D9DF')
    footer(ax,18); save(pdf,fig)

    # 19 digital, service measures
    fig,ax=page(INK)
    title(ax,'05 / EXPERIENCE & MEASUREMENT','Make the service easy to understand—and evaluate.','A website should explain what is available now, what is proposed, who the service is for and how to enquire.',headsize=30)
    nav=['HOME','ABOUT','SERVICES','RESIDENTIAL','BUSINESS','TECHNOLOGY','COMMUNITY SAFETY','CONTACT']
    for i,s in enumerate(nav):
        x=.06+i*.112
        box(ax,x,.60,.102,.06,PANEL,edge=LINE)
        txt(ax,x+.051,.63,s,size=5.5,color=WHITE,weight='bold',ha='center',va='center')
    metrics=[('PARTICIPATION','Active clients, cancellations, renewals.'),('DELIVERY','Agreed schedules completed; incident records.'),('EXPERIENCE','Feedback, complaints, resolution, referrals.'),('TECHNOLOGY','Equipment uptime and support resolution.'),('COMPLIANCE','Registrations, training and authorisations maintained.')]
    for i,(h,b) in enumerate(metrics):
        col=i%3; row=i//3; x=.06+col*.30; y=.38-row*.19
        add_card(ax,x,y,.275,.145,h,b,num=f'{i+1:02d}')
    paragraph(ax,.06,.13,'Set targets only after scope and resources are defined. Incident counts alone are not a simple success measure: reporting may rise when residents trust the reporting process.',width=105,size=8,color=MUTED)
    footer(ax,19); save(pdf,fig)

    # 20 business model
    fig,ax=page(PAPER)
    label(ax,.06,.91,'06 / Business development · illustrative residential scenarios',color=RED)
    txt(ax,.06,.84,'Validate the model before launch.',size=29,color='#11151A',weight='bold')
    paragraph(ax,.06,.77,'Illustrative gross monthly subscription revenue from the supplied proposal. These are examples—not approved prices, profit forecasts or service commitments.',width=110,size=9.2,color=GREY)
    scenarios=[('100 × R200','R20,000'),('150 × R300','R45,000'),('190 × R300','R57,000'),('190 × R500','R95,000')]
    for i,(a,b) in enumerate(scenarios):
        x=.06+i*.225
        box(ax,x,.48,.205,.22,'#FFFFFF',edge='#D6D9DA')
        txt(ax,x+.017,.65,a,size=8,color=GREY,weight='bold')
        txt(ax,x+.017,.56,b,size=24,color='#11151A',weight='bold')
        txt(ax,x+.017,.505,'GROSS / MONTH',size=6.4,color=RED,weight='bold')
    label(ax,.06,.40,'Before pricing is final, cost the real service')
    costs=['Staffing & hours','Vehicles & fuel','Equipment & maintenance','Insurance & compliance','Technology & suppliers','Administration & taxes']
    for i,s in enumerate(costs):
        x=.06+(i%3)*.30; y=.33-(i//3)*.085
        txt(ax,x,y,'•  '+s,size=8,color='#3F4650')
    rule(ax,.06,.15,.88,color='#C9CCCD')
    paragraph(ax,.06,.12,'Validate the estimated 180–200 households with a survey. Model collection, bad debt, cost-to-serve and sustainable margin. Separate optional technology charges where appropriate.',width=110,size=8,color=GREY)
    footer(ax,20,dark=False); save(pdf,fig)

    # 21 compliance & partners
    fig,ax=page(INK)
    title(ax,'06 / BUSINESS DEVELOPMENT','Build credibility through compliance and capability.','A registration, a supplier conversation, a formal partnership and an awarded contract are different milestones. Describe each accurately.',headsize=29)
    gates=[('01 / COMPANY & PERSONNEL','Verify CIPC records, PSiRA requirements and the status of every relevant person. Confirm requirements for each proposed service.'),('02 / DELIVERY & RISK','Define service area, staffing, training, insurance, incident procedures, contracts and client disclosures.'),('03 / TECHNOLOGY & PRIVACY','Review CCTV, tracking and monitoring data, access, retention, security and supplier roles.'),('04 / PARTNERSHIPS','Document scope, responsibilities, cost, support and lawful escalation. Proposed discussions are not partnerships.')]
    for i,(h,b) in enumerate(gates):
        col=i%2; row=i//2; x=.06+col*.455; y=.53-row*.225
        add_card(ax,x,y,.425,.20,h,b,num=f'GATE 0{i+1}')
    box(ax,.06,.105,.88,.11,'#35131B',edge='#61202C')
    label(ax,.08,.18,'Important operating gate')
    paragraph(ax,.08,.15,'The supplied proposal states that CIPC registration occurred on 30 September 2026 and notes outstanding PSiRA and operational requirements. Verify all current official status before public use or launch. CIPC registration alone does not authorise every regulated private-security service.',width=131,size=7.7,color='#E9DDE0')
    txt(ax,.06,.075,'Confirm requirements with PSiRA, relevant authorities and qualified advisers. This strategy is not legal advice.',size=6.5,color='#959DA7')
    footer(ax,21); save(pdf,fig)

    # 22 marketing & growth engine
    fig,ax=page(INK)
    title(ax,'06 / BUSINESS DEVELOPMENT','Start with evidence and trust.','The first marketing objective is to validate demand—not to collect subscriptions before the operating model is ready.',headsize=30)
    steps=[('01','COMMUNITY ENGAGEMENT','Explain the proposal and listen.'),('02','HOUSEHOLD SURVEY','Verify the market and affordability.'),('03','SERVICE PROPOSAL','Present real capabilities, price and terms.'),('04','CLIENT ONBOARDING','Obtain informed agreement and explain scope.'),('05','REVIEW & REFINE','Measure delivery, costs and feedback.')]
    for i,(n,h,b) in enumerate(steps):
        x=.06+i*.18
        box(ax,x,.58,.16,.17,PANEL,edge=LINE)
        label(ax,x+.014,.72,n)
        txt(ax,x+.014,.675,h,size=7.1,color=WHITE,weight='bold')
        paragraph(ax,x+.014,.625,b,width=26,size=6.8,color=MUTED)
    label(ax,.06,.49,'Useful early channels')
    channels=['Community meetings','Printed service proposal','Professional website','Business introductions','Approved community groups','Verified case studies after launch']
    for i,s in enumerate(channels):
        x=.06+(i%3)*.30; y=.43-(i//3)*.08
        txt(ax,x,y,'•  '+s,size=8,color='#D9DDE2')
    box(ax,.06,.13,.88,.12,'#171C24')
    label(ax,.085,.22,'The business engine')
    txt(ax,.085,.175,'Need → service design → capability → delivery → accountability → trust → sustainable growth',size=11,color=WHITE,weight='bold')
    footer(ax,22); save(pdf,fig)

    # 23 roadmap
    fig,ax=page(INK)
    title(ax,'IMPLEMENTATION ROADMAP','First 90 days: verify, validate, decide.','Proposed planning windows—not guaranteed launch dates. If readiness gates are not met, move the launch.',headsize=30)
    stages=[('DAYS 01–30','FOUNDATION & VERIFICATION',['Verify compliance & readiness','Define proposed service scope','Gather costs & supplier quotes','Prepare household survey','Confirm roles & accountability']),('DAYS 31–60','VALIDATION & SYSTEM DESIGN',['Conduct community research','Review demand & affordability','Refine budget and pricing','Develop CI & business documents','Document service procedures']),('DAYS 61–90','DECISION & PREPARATION',['Assess feasibility against evidence','Confirm agreements and resources','Finalise authorised services','Prepare client onboarding','Decide if a compliant pilot is viable'])]
    for i,(n,h,bullets) in enumerate(stages):
        x=.06+i*.30
        box(ax,x,.22,.275,.55,PANEL,edge=LINE)
        label(ax,x+.025,.72,n)
        txt(ax,x+.025,.655,h,size=12,color=WHITE,weight='bold')
        for j,b in enumerate(bullets):
            txt(ax,x+.025,.59-j*.068,'•  '+b,size=7.7,color=MUTED)
    footer(ax,23); save(pdf,fig)

    # 24 conclusion
    fig,ax=page(INK)
    # subtle circular/crest geometry, no repeated photo
    for r,a in [(0.31,.12),(0.24,.12),(0.17,.13)]:
        ax.add_patch(Circle((.79,.57),r,transform=ax.transAxes,facecolor='none',edgecolor=RED,linewidth=1,alpha=a))
    logo(ax,.67,.35,.24,.44,alpha=.48)
    label(ax,.06,.91,'The complete brand model')
    txt(ax,.06,.82,'SIYAVIKELA\nSECURITY SERVICES',size=24,color=WHITE,weight='bold',linespacing=1.05)
    txt(ax,.06,.69,'PROTECTION THAT CONNECTS.',size=11,color=RED,weight='bold')
    rule(ax,.06,.63,.42,color=LINE)
    final=[('PURPOSE','Create safer communities through professional, accountable security.'),('POSITION','Community-rooted. Professionally operated.'),('PROMISE','Professional protection. Transparent service. Community accountability.'),('PRINCIPLE','Understand → prepare → connect → protect → account → improve.')]
    for i,(h,b) in enumerate(final):
        y=.57-i*.095
        label(ax,.06,y,h,size=6.8)
        paragraph(ax,.18,y,b,width=58,size=8.1,color=WHITE)
    box(ax,.06,.105,.52,.075,RED)
    txt(ax,.08,.142,'BUILD TRUST BEFORE SCALE.',size=10,color=WHITE,weight='bold',va='center')
    txt(ax,.06,.075,'Establish compliance before launch. Prove service quality before making bigger promises.',size=7.2,color='#A6ADB7')
    txt(ax,.94,.08,'DOBSONVILLE · SOWETO · 2026',size=6.4,color='#9EA5AF',weight='bold',ha='right')
    footer(ax,24); save(pdf,fig)

print(f'Wrote {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB)')
