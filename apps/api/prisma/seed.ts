import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
async function main(){
  const [almacen,bodega,tienda]=await Promise.all([
    db.location.upsert({where:{name:'Almacén Central'},update:{},create:{name:'Almacén Central'}}),
    db.location.upsert({where:{name:'Bodega Norte'},update:{},create:{name:'Bodega Norte'}}),
    db.location.upsert({where:{name:'Punto de Venta Centro'},update:{},create:{name:'Punto de Venta Centro'}}),
  ]);
  const demo=[['SKU-001','Producto A',100,30,10],['SKU-002','Producto B',45,10,0],['SKU-003','Producto C',80,0,5],['SKU-004','Producto D',15,0,0]];
  for(const [sku,name,physical,reserved,blocked] of demo){
    const p=await db.product.upsert({where:{sku:String(sku)},update:{name:String(name)},create:{sku:String(sku),name:String(name)}});
    await db.stock.upsert({where:{productId_locationId:{productId:p.id,locationId:almacen.id}},create:{productId:p.id,locationId:almacen.id,physical:Number(physical),reserved:Number(reserved),blocked:Number(blocked)},update:{}});
  }
  const p=await db.product.findUniqueOrThrow({where:{sku:'SKU-001'}});
  await db.stock.upsert({where:{productId_locationId:{productId:p.id,locationId:bodega.id}},create:{productId:p.id,locationId:bodega.id,physical:12},update:{}});
  console.log('Datos demo preparados: ',{almacen:almacen.name,tienda:tienda.name});
}
main().finally(()=>db.$disconnect());
