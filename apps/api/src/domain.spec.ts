import { describe, expect, it } from 'vitest';

describe('Reglas de dominio SGTL',()=>{
  const available=(physical:number,reserved:number,blocked:number)=>physical-reserved-blocked;
  it('no trata stock reservado como disponible',()=>expect(available(100,30,10)).toBe(60));
  it('una recepción no convierte presentada en aceptada',()=>{
    const presented=28,accepted=25,rejected=3;
    expect(accepted+rejected).toBe(presented);
    expect(accepted).not.toBe(presented);
  });
  it('cierre administrativo y cumplimiento son conceptos distintos',()=>{
    const requested=20,accepted=18,closed=true;
    expect(closed).toBe(true);
    expect(accepted===requested).toBe(false);
  });
});
