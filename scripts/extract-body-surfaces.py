import gzip, json, struct, sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Usage: python scripts/extract-body-surfaces.py /path/to/Human-Atlas/public/models')
source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'public' / 'models'
target.mkdir(parents=True, exist_ok=True)

for sex, manifest_name, prefix in [('male','atlas.json','body-'),('female','atlas-female.json','female-')]:
    manifest=json.loads((source/manifest_name).read_text())
    vertices=[]; normals=[]; indices=[]; base=0
    for chunk_index, chunk in enumerate(manifest['chunks']):
        filename=f'{prefix}{chunk_index}.bin.gz'
        data=gzip.decompress((source/filename).read_bytes())
        for part in manifest['parts']:
            if part['chunk'] != chunk_index or part['name'].lower() != 'skin': continue
            n=part['vertexCount']; ni=part['indexCount']
            vertices.extend(struct.unpack_from('<%sf'% (n*3),data,part['positions']))
            normals.extend(x/32767 for x in struct.unpack_from('<%sh'% (n*3),data,part['normals']))
            indices.extend(i+base for i in struct.unpack_from('<%sI'%ni,data,part['indices']))
            base += n
    vertex_bytes=struct.pack('<%sf'%len(vertices),*vertices)
    normal_bytes=struct.pack('<%sf'%len(normals),*normals)
    index_bytes=struct.pack('<%sI'%len(indices),*indices)
    binary=vertex_bytes+normal_bytes+index_bytes
    while len(binary)%4: binary+=b'\0'
    gltf={'asset':{'version':'2.0','generator':'CARELOOP optimized Human Atlas surface'},'scene':0,'scenes':[{'nodes':[0]}], 'nodes':[{'mesh':0}], 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2}]}], 'buffers':[{'byteLength':len(vertex_bytes)+len(normal_bytes)+len(index_bytes)}], 'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(vertex_bytes),'target':34962},{'buffer':0,'byteOffset':len(vertex_bytes),'byteLength':len(normal_bytes),'target':34962},{'buffer':0,'byteOffset':len(vertex_bytes)+len(normal_bytes),'byteLength':len(index_bytes),'target':34963}], 'accessors':[{'bufferView':0,'componentType':5126,'count':len(vertices)//3,'type':'VEC3','min':[min(vertices[::3]),min(vertices[1::3]),min(vertices[2::3])],'max':[max(vertices[::3]),max(vertices[1::3]),max(vertices[2::3])]},{'bufferView':1,'componentType':5126,'count':len(normals)//3,'type':'VEC3'},{'bufferView':2,'componentType':5125,'count':len(indices),'type':'SCALAR'}]}
    js=json.dumps(gltf,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4)
    total=12+8+len(js)+8+len(binary)
    glb=struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary
    (target/f'{sex}-surface.glb').write_bytes(glb)
    print(sex, len(vertices)//3, len(indices)//3, len(glb))
