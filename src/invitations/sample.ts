import {initial, type Content} from "./store";
import {templates} from "./templates";

export function sampleContent(path:string):Content|null {
  const route=path.replace(/\/$/,"");
  const design=templates.find(t=>route===t.path || route==="/muestra/"+t.id);
  if(!design)return null;
  return {
    ...initial, templateId:design.id, name:"Camila", color:design.color,
    event:"2026-12-19T19:00",phone:"51912424331",
    parents:"Diego Herrera y Valeria Ríos",sponsors:"Andrés Vega y Lucía Torres",
    venue:"Hotel Country Club Lima",address:"Los Eucaliptos 590, San Isidro, Lima",
    maps:"https://www.google.com/maps/search/?api=1&query=Country+Club+Lima+Hotel+Los+Eucaliptos+590",
    letter:"¡Ya casi llegan mis quince! A veces ensayo mi primer baile en la sala y me da risa pensar en los nervios que voy a sentir esa noche.\n\nMe siento muy agradecida por llegar a este día rodeada de tanto cariño. Y cuando imagino la fiesta, hay un momento que me hace especial ilusión: mirar entre las mesas, encontrarte y correr a darte un abrazo.\n\nOjalá puedas acompañarme. Quiero que, cuando vuelva a ver las fotos dentro de unos años, podamos decir: «¿Te acuerdas de esa noche?».",
    album:["elena","flora","cielo","dalia","alba","brisa","gala","iris"].map(name=>"/muestra-fotos/"+name+".jpg"),
    gifts:[
  ['Aretes de plata','Ilaria'], ['Pulsera de dijes','Swarovski'],
  ['Collar con inicial','Falabella'], ['Cartera pequeña','Amphora'],
  ['Mochila para paseos','Crepier'], ['Billetera','Renzo Costa'],
  ['Zapatillas urbanas','Platanitos'], ['Chompa tejida','Ripley'],
  ['Perfume floral','Perfumerías Unidas'], ['Set de brochas','Aruma'],
  ['Álbum para fotos','Tai Loy'], ['Diario con candado','Tai Loy'],
  ['Novela juvenil','Crisol'], ['Audífonos inalámbricos','Coolbox'],
  ['Parlante portátil','Coolbox'], ['Botella térmica','Casaideas']
],
    qr:"yapedemo.webp"
  };
}

