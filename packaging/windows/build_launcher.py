import struct, os
from pathlib import Path

out = Path('/mnt/data/dia9_exe/release/Dia9Dragon-Local-1.4-Reports/Dia9Dragon.exe')
FILE_ALIGN=0x200; SECT_ALIGN=0x1000; IMAGE_BASE=0x140000000
text_rva=0x1000; idata_rva=0x2000; rdata_rva=0x3000

def align(x,a): return (x+a-1)//a*a

def u16(s): return s.encode('utf-16le')+b'\x00\x00'

# rdata strings
verb=u16('open')
file=u16('START_APP.bat')
rdata=verb+file
verb_rva=rdata_rva
file_rva=rdata_rva+len(verb)

# idata layout
# descriptors 3*20, then ILTs/IATs/names/hintnames
idata=bytearray(0x400)
off_desc=0
off_ilt_shell=0x40
off_iat_shell=0x50
off_ilt_kernel=0x60
off_iat_kernel=0x70
off_name_shell=0x80
off_name_kernel=0x90
off_hint_shell=0xA0
off_hint_exit=0xC0

def wr32(off,v): idata[off:off+4]=struct.pack('<I',v)
def wr64(off,v): idata[off:off+8]=struct.pack('<Q',v)
# descriptors
# shell32
for base, vals in [(0,(idata_rva+off_ilt_shell,0,0,idata_rva+off_name_shell,idata_rva+off_iat_shell)),
                   (20,(idata_rva+off_ilt_kernel,0,0,idata_rva+off_name_kernel,idata_rva+off_iat_kernel))]:
    for i,v in enumerate(vals): wr32(base+i*4,v)
# thunks
wr64(off_ilt_shell,idata_rva+off_hint_shell); wr64(off_iat_shell,idata_rva+off_hint_shell)
wr64(off_ilt_kernel,idata_rva+off_hint_exit); wr64(off_iat_kernel,idata_rva+off_hint_exit)
idata[off_name_shell:off_name_shell+12]=b'SHELL32.dll\0'
idata[off_name_kernel:off_name_kernel+13]=b'KERNEL32.dll\0'
idata[off_hint_shell:off_hint_shell+2]=b'\0\0'; idata[off_hint_shell+2:off_hint_shell+2+14]=b'ShellExecuteW\0'
idata[off_hint_exit:off_hint_exit+2]=b'\0\0'; idata[off_hint_exit+2:off_hint_exit+2+12]=b'ExitProcess\0'

# x64 code with RIP-relative displacements
code=bytearray()
def emit(b): code.extend(b)
def lea_reg_rip(op, target_rva):
    # op bytes include rex+8d+modrm
    next_rva=text_rva+len(code)+len(op)+4
    emit(op); emit(struct.pack('<i', target_rva-next_rva))
def call_iat(target_rva):
    next_rva=text_rva+len(code)+6
    emit(b'\xff\x15'); emit(struct.pack('<i', target_rva-next_rva))

emit(b'\x48\x83\xec\x28')       # sub rsp,40
emit(b'\x48\x31\xc9')           # xor rcx,rcx
lea_reg_rip(b'\x48\x8d\x15', verb_rva) # rdx
lea_reg_rip(b'\x4c\x8d\x05', file_rva) # r8
emit(b'\x4d\x31\xc9')           # xor r9,r9
emit(b'\x48\xc7\x44\x24\x20\x01\x00\x00\x00') # [rsp+32]=1
call_iat(idata_rva+off_iat_shell)
emit(b'\x31\xc9')               # xor ecx,ecx
call_iat(idata_rva+off_iat_kernel)
emit(b'\xcc')

text_raw=align(len(code),FILE_ALIGN); idata_raw=align(len(idata),FILE_ALIGN); rdata_raw=align(len(rdata),FILE_ALIGN)
headers_size=0x400
text_ptr=headers_size; idata_ptr=text_ptr+text_raw; rdata_ptr=idata_ptr+idata_raw
size_image=align(rdata_rva+len(rdata),SECT_ALIGN)

buf=bytearray(headers_size+text_raw+idata_raw+rdata_raw)
# DOS
buf[0:2]=b'MZ'; buf[0x3c:0x40]=struct.pack('<I',0x80)
buf[0x80:0x84]=b'PE\0\0'
coff=struct.pack('<HHIIIHH',0x8664,3,0,0,0,0xF0,0x0022)
buf[0x84:0x84+20]=coff
opt=bytearray(0xF0)
struct.pack_into('<H',opt,0,0x20b)
opt[2]=14
struct.pack_into('<I',opt,4,text_raw)
struct.pack_into('<I',opt,8,idata_raw+rdata_raw)
struct.pack_into('<I',opt,16,text_rva)
struct.pack_into('<I',opt,20,text_rva)
struct.pack_into('<Q',opt,24,IMAGE_BASE)
struct.pack_into('<I',opt,32,SECT_ALIGN)
struct.pack_into('<I',opt,36,FILE_ALIGN)
struct.pack_into('<HH',opt,40,6,0)
struct.pack_into('<HH',opt,48,6,0)
struct.pack_into('<I',opt,56,size_image)
struct.pack_into('<I',opt,60,headers_size)
struct.pack_into('<H',opt,68,2) # GUI
struct.pack_into('<H',opt,70,0x8160)
struct.pack_into('<Q',opt,72,0x100000)
struct.pack_into('<Q',opt,80,0x1000)
struct.pack_into('<Q',opt,88,0x100000)
struct.pack_into('<Q',opt,96,0x1000)
struct.pack_into('<I',opt,108,16)
# import dir index1
struct.pack_into('<II',opt,112+8,idata_rva,60)
buf[0x98:0x98+0xF0]=opt
sec_off=0x188
def sec(name,vsize,rva,rsize,ptr,chars):
    global sec_off
    hdr=struct.pack('<8sIIIIIIHHI',name.encode().ljust(8,b'\0'),vsize,rva,rsize,ptr,0,0,0,0,chars)
    buf[sec_off:sec_off+40]=hdr; sec_off+=40
sec('.text',len(code),text_rva,text_raw,text_ptr,0x60000020)
sec('.idata',len(idata),idata_rva,idata_raw,idata_ptr,0xC0000040)
sec('.rdata',len(rdata),rdata_rva,rdata_raw,rdata_ptr,0x40000040)
buf[text_ptr:text_ptr+len(code)]=code
buf[idata_ptr:idata_ptr+len(idata)]=idata
buf[rdata_ptr:rdata_ptr+len(rdata)]=rdata
out.write_bytes(buf)
print(out, len(buf))
