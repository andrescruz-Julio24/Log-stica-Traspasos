import { BadRequestException,ConflictException } from '@nestjs/common';

export function ensure(condition:unknown,message:string):asserts condition{
  if(!condition)throw new ConflictException(message);
}
export function uniqueItems(items:{productId:string}[]){
  if(new Set(items.map(x=>x.productId)).size!==items.length){
    throw new BadRequestException('No se permiten SKU duplicados en la misma operación');
  }
}
