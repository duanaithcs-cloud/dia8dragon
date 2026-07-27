import { Classroom, ClassroomAssignment, Topic } from '../types';

export interface TeacherReportContext {
  classroom: Classroom;
  assignments: ClassroomAssignment[];
  topics: Topic[];
  generatedAt?: Date;
}

type CellValue = string | number | null | undefined;
interface SheetSpec { name: string; rows: CellValue[][]; widths?: number[]; }

const safeName = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 80);
const xml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const downloadBlob = (name: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const statusLabel = (status: string) => ({ NOT_STARTED: 'Chưa bắt đầu', IN_PROGRESS: 'Đang làm', SUBMITTED: 'Đã nộp', LATE: 'Nộp muộn' }[status] || status);
const viDate = (value?: string | Date) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';

const reportRows = ({ classroom, assignments, topics, generatedAt = new Date() }: TeacherReportContext): SheetSpec[] => {
  const topicMap = new Map(topics.map(t => [t.topic_id, `${t.topic_id}. ${t.keyword_label}`]));
  const allSubs = assignments.flatMap(a => a.submissions.map(s => ({ a, s })));
  const done = allSubs.filter(({ s }) => s.status === 'SUBMITTED' || s.status === 'LATE');
  const scores = done.map(({ s }) => s.score).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const completion = allSubs.length ? done.length / allSubs.length : 0;
  const overview: CellValue[][] = [
    ['BÁO CÁO LỚP HỌC DIA8DRAGON'],
    ['Lớp', classroom.name], ['Năm học', classroom.schoolYear], ['Môn học', classroom.subject],
    ['Ngày xuất', viDate(generatedAt)], ['Số học sinh', classroom.students.length], ['Số nhiệm vụ', assignments.length],
    ['Tổng lượt được giao', allSubs.length], ['Đã nộp', done.length], ['Tỉ lệ hoàn thành', `${Math.round(completion * 100)}%`],
    ['Điểm trung bình', scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length * 10) / 10 : 'Chưa có'],
    [], ['NHIỆM VỤ', 'Hạn nộp', 'Đã nộp', 'Tổng', 'Tỉ lệ', 'Điểm TB']
  ];
  assignments.forEach(a => {
    const submitted = a.submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE');
    const aScores = submitted.map(s => s.score).filter((v): v is number => typeof v === 'number');
    overview.push([a.title, viDate(a.dueAt), submitted.length, a.submissions.length, a.submissions.length ? `${Math.round(submitted.length * 100 / a.submissions.length)}%` : '0%', aScores.length ? Math.round(aScores.reduce((x,y)=>x+y,0)/aScores.length*10)/10 : '']);
  });

  const detail: CellValue[][] = [['Mã nhiệm vụ','Nhiệm vụ','Chuyên đề','Hạn nộp','Mã HS','Học sinh','Trạng thái','Tiến độ (%)','Điểm','Thời gian nộp']];
  assignments.forEach(a => a.submissions.forEach(s => {
    const student = classroom.students.find(st => st.id === s.studentId);
    detail.push([a.id, a.title, a.topicIds.map(id => topicMap.get(id) || id).join('; '), viDate(a.dueAt), student?.studentCode || student?.id || '', student?.fullName || 'Không rõ', statusLabel(s.status), s.progressPercent, s.score ?? '', viDate(s.submittedAt)]);
  }));

  const students: CellValue[][] = [['STT','Mã học sinh','Họ và tên','Số nhiệm vụ','Đã nộp','Nộp muộn','Tỉ lệ hoàn thành','Điểm trung bình']];
  classroom.students.forEach((st, index) => {
    const subs = assignments.map(a => a.submissions.find(s => s.studentId === st.id)).filter(Boolean);
    const submitted = subs.filter(s => s!.status === 'SUBMITTED' || s!.status === 'LATE');
    const late = subs.filter(s => s!.status === 'LATE');
    const stScores = submitted.map(s => s!.score).filter((v): v is number => typeof v === 'number');
    students.push([index+1, st.studentCode || st.id, st.fullName, subs.length, submitted.length, late.length, subs.length ? `${Math.round(submitted.length*100/subs.length)}%` : '0%', stScores.length ? Math.round(stScores.reduce((a,b)=>a+b,0)/stScores.length*10)/10 : '']);
  });
  return [
    { name: 'Tong quan', rows: overview, widths: [34,22,14,12,14,14] },
    { name: 'Chi tiet ket qua', rows: detail, widths: [22,30,42,20,18,28,18,14,12,20] },
    { name: 'Theo doi hoc sinh', rows: students, widths: [8,18,28,15,12,12,18,18] }
  ];
};

const crcTable = (() => { const t = new Uint32Array(256); for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t; })();
const crc32 = (data: Uint8Array) => { let c=0xffffffff; for (const b of data)c=crcTable[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0; };
const u16 = (n:number) => [n&255,(n>>>8)&255]; const u32=(n:number)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
const zipStore = (files: {name:string; data:string|Uint8Array}[]) => {
  const enc=new TextEncoder(); const chunks:number[]=[]; const central:number[]=[]; let offset=0;
  files.forEach(f=>{const name=enc.encode(f.name), data=typeof f.data==='string'?enc.encode(f.data):f.data, crc=crc32(data); const local=[0x50,0x4b,0x03,0x04,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]; chunks.push(...local,...data); central.push(0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name); offset+=local.length+data.length;});
  const cdOffset=chunks.length; chunks.push(...central,0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(central.length),...u32(cdOffset),...u16(0)); return new Uint8Array(chunks);
};
const colName=(n:number)=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const sheetXml=(spec:SheetSpec)=>{
  const cols=(spec.widths||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
  const rows=spec.rows.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>{const ref=`${colName(ci+1)}${ri+1}`, style=ri===0||ri===12?1:0; return typeof v==='number'?`<c r="${ref}" s="${style}"><v>${v}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;}).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${colName(Math.max(...spec.rows.map(r=>r.length),1))}${spec.rows.length}"/></worksheet>`;
};
export const exportTeacherExcel = (ctx: TeacherReportContext) => {
  const sheets=reportRows(ctx); const files:{name:string;data:string|Uint8Array}[]=[];
  files.push({name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`});
  files.push({name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`});
  files.push({name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`});
  files.push({name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`});
  files.push({name:'xl/styles.xml',data:`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs></styleSheet>`});
  sheets.forEach((s,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:sheetXml(s)}));
  const bytes=zipStore(files); downloadBlob(`Bao-cao-${safeName(ctx.classroom.name)}-${new Date().toISOString().slice(0,10)}.xlsx`,new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
};

const dataUrlBytes=(url:string)=>{const b=atob(url.split(',')[1]);const out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;};
const makePdf=(images:{bytes:Uint8Array;width:number;height:number}[])=>{
  const enc=new TextEncoder(); const objects:(string|Uint8Array)[]=[]; const add=(v:string|Uint8Array)=>{objects.push(v);return objects.length;};
  const catalogId=add(''); const pagesId=add(''); const pageIds:number[]=[];
  images.forEach((img,i)=>{const imgId=add(img.bytes);const contentId=add(`q\n595 0 0 842 0 0 cm\n/Im${i+1} Do\nQ`);const pageId=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i+1} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);pageIds.push(pageId);});
  objects[catalogId-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`; objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const chunks:Uint8Array[]=[enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];const offsets=[0];let pos=chunks[0].length;
  objects.forEach((obj,index)=>{offsets.push(pos);let chunk:Uint8Array;if(obj instanceof Uint8Array){const head=enc.encode(`${index+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${images[Math.floor((index-2)/3)]?.width||1240} /Height ${images[Math.floor((index-2)/3)]?.height||1754} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${obj.length} >>\nstream\n`);const tail=enc.encode('\nendstream\nendobj\n');chunk=new Uint8Array(head.length+obj.length+tail.length);chunk.set(head);chunk.set(obj,head.length);chunk.set(tail,head.length+obj.length);}else chunk=enc.encode(`${index+1} 0 obj\n${obj}\nendobj\n`);chunks.push(chunk);pos+=chunk.length;});
  const xref=enc.encode(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${pos}\n%%EOF`);chunks.push(xref);const total=chunks.reduce((n,c)=>n+c.length,0),out=new Uint8Array(total);let p=0;chunks.forEach(c=>{out.set(c,p);p+=c.length;});return out;
};

export const exportTeacherPdf = (ctx: TeacherReportContext) => {
  const { classroom, assignments }=ctx; const pageW=1240,pageH=1754,margin=72,rowH=42; const pages:HTMLCanvasElement[]=[];
  const makePage=(title:string)=>{const c=document.createElement('canvas');c.width=pageW;c.height=pageH;const g=c.getContext('2d')!;g.fillStyle='#fff';g.fillRect(0,0,pageW,pageH);g.fillStyle='#12344d';g.fillRect(0,0,pageW,150);g.fillStyle='#fff';g.font='bold 38px Arial';g.fillText(title,margin,64);g.font='22px Arial';g.fillText(`${classroom.name} - ${classroom.schoolYear} - Địa lí 8`,margin,108);pages.push(c);return {c,g,y:200};};
  let {g,y}=makePage('BÁO CÁO THEO DÕI LỚP HỌC'); const all=assignments.flatMap(a=>a.submissions),done=all.filter(s=>['SUBMITTED','LATE'].includes(s.status)),scores=done.map(s=>s.score).filter((v):v is number=>typeof v==='number');
  g.fillStyle='#111';g.font='26px Arial';[['Ngày xuất',viDate(new Date())],['Số học sinh',classroom.students.length],['Số nhiệm vụ',assignments.length],['Tỉ lệ hoàn thành',`${all.length?Math.round(done.length*100/all.length):0}%`],['Điểm trung bình',scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'Chưa có']].forEach(([k,v])=>{g.fillStyle='#5d6d7e';g.fillText(String(k),margin,y);g.fillStyle='#111';g.font='bold 28px Arial';g.fillText(String(v),430,y);g.font='26px Arial';y+=55;});y+=35;g.font='bold 27px Arial';g.fillText('Tổng hợp nhiệm vụ',margin,y);y+=50;
  const drawHeader=(labels:string[],widths:number[])=>{g.fillStyle='#dbeaf5';g.fillRect(margin,y,pageW-2*margin,rowH);g.fillStyle='#12344d';g.font='bold 19px Arial';let x=margin+10;labels.forEach((l,i)=>{g.fillText(l,x,y+28);x+=widths[i];});y+=rowH;};
  drawHeader(['Nhiệm vụ','Hạn','Đã nộp','Tỉ lệ','Điểm TB'],[430,230,135,135,140]);g.font='18px Arial';assignments.forEach(a=>{if(y>pageH-120){({g,y}=makePage('BÁO CÁO NHIỆM VỤ'));drawHeader(['Nhiệm vụ','Hạn','Đã nộp','Tỉ lệ','Điểm TB'],[430,230,135,135,140]);}const sub=a.submissions.filter(s=>['SUBMITTED','LATE'].includes(s.status)),sc=sub.map(s=>s.score).filter((v):v is number=>typeof v==='number');let x=margin+10;[a.title.slice(0,38),viDate(a.dueAt),`${sub.length}/${a.submissions.length}`,`${a.submissions.length?Math.round(sub.length*100/a.submissions.length):0}%`,sc.length?(sc.reduce((p,q)=>p+q,0)/sc.length).toFixed(1):''].forEach((v,i)=>{g.fillStyle='#222';g.fillText(String(v),x,y+28);x+=[430,230,135,135,140][i];});g.strokeStyle='#ddd';g.beginPath();g.moveTo(margin,y+rowH);g.lineTo(pageW-margin,y+rowH);g.stroke();y+=rowH;});
  ({g,y}=makePage('CHI TIẾT KẾT QUẢ HỌC SINH'));const widths=[300,310,150,130,150];drawHeader(['Học sinh','Nhiệm vụ','Trạng thái','Tiến độ','Điểm'],widths);g.font='17px Arial';assignments.forEach(a=>a.submissions.forEach(s=>{if(y>pageH-100){({g,y}=makePage('CHI TIẾT KẾT QUẢ HỌC SINH'));drawHeader(['Học sinh','Nhiệm vụ','Trạng thái','Tiến độ','Điểm'],widths);}const st=classroom.students.find(x=>x.id===s.studentId);let x=margin+10;[st?.fullName||'Không rõ',a.title.slice(0,28),statusLabel(s.status),`${s.progressPercent}%`,s.score??''].forEach((v,i)=>{g.fillStyle='#222';g.fillText(String(v),x,y+28);x+=widths[i];});g.strokeStyle='#e5e5e5';g.beginPath();g.moveTo(margin,y+rowH);g.lineTo(pageW-margin,y+rowH);g.stroke();y+=rowH;}));
  pages.forEach(c=>{const cg=c.getContext('2d')!;cg.fillStyle='#777';cg.font='16px Arial';cg.fillText('Dia8Dragon Local - Báo cáo được tạo trên thiết bị',margin,pageH-40);});
  const imgs=pages.map(c=>({bytes:dataUrlBytes(c.toDataURL('image/jpeg',0.9)),width:c.width,height:c.height}));downloadBlob(`Bao-cao-${safeName(classroom.name)}-${new Date().toISOString().slice(0,10)}.pdf`,new Blob([makePdf(imgs)],{type:'application/pdf'}));
};
