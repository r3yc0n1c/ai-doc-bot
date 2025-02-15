__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

import chromadb
 
client = chromadb.HttpClient(host='localhost', port=8000)

collection = client.get_collection(name="docs")
print(collection.get(include=["documents"]))

if sys.argv[1] == 'del':
    client.delete_collection(name="docs")
    client.get_collection(name="docs")