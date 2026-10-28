/* Offline map geometry. Coordinates use a fixed equirectangular projection. */
const TripMap=(()=>{
 const project=([lon,lat])=>[(lon+75)*20.5,(-20-lat)*25];
 function fit(coords,full=false){
  if(full||!coords.length)coords=[[-74,-56],[-52,-21]];
  const ps=coords.map(project),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);
  let width=Math.max(100,Math.max(...xs)-Math.min(...xs)+65),height=Math.max(100,Math.max(...ys)-Math.min(...ys)+65);
  const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;
  if(width/height<.96)width=height*.96;else height=width/.96;
  return [cx-width/2,cy-height/2,width,height];
 }
 function zoom(view,factor){const w=Math.max(25,Math.min(1400,view[2]*factor)),h=w*view[3]/view[2];return [view[0]+(view[2]-w)/2,view[1]+(view[3]-h)/2,w,h];}
 const pan=(v,dx,dy)=>[Math.max(-1400,Math.min(1800,v[0]+dx)),Math.max(-1400,Math.min(2100,v[1]+dy)),v[2],v[3]];
 const country=[[-68.8,-22],[-66.3,-22],[-64.4,-22.1],[-62.5,-22.5],[-60.5,-23.9],[-58.3,-25.1],[-57.5,-25.6],[-55.8,-27.3],[-54.6,-25.6],[-53.7,-26.7],[-55.8,-29.8],[-57.6,-30.2],[-58.3,-33.6],[-57.2,-35.2],[-56.7,-36.5],[-57.6,-38],[-61.3,-39],[-62.3,-40.7],[-64.5,-41.1],[-65,-42.5],[-63.7,-42.7],[-65.3,-44.8],[-67.3,-46],[-66.1,-47.2],[-67.7,-49],[-69,-50.8],[-68.4,-52.3],[-71.9,-52],[-72.5,-50],[-73,-49],[-71.7,-45],[-71.8,-42],[-71,-40],[-70.8,-37],[-70.2,-35],[-70.3,-32],[-69.7,-30],[-69.2,-28],[-68.3,-26],[-67.3,-24.5]];
 return {project,fit,zoom,pan,country};
})();
