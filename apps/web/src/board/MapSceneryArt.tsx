/** Original pop-up paper diorama, kept entirely below the playable board graph. */
export function MapSceneryArt() {
  return <g className="map-scenery" aria-hidden="true" strokeLinejoin="round" strokeLinecap="round">
    <defs>
      <filter id="map-cut-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="9" stdDeviation="1.5" floodColor="#412b38" floodOpacity=".35" /></filter>
      <pattern id="map-paper-dots" width="27" height="27" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r="2" fill="#79536e" opacity=".13" /><circle cx="19" cy="21" r="1.5" fill="#79536e" opacity=".11" /></pattern>
      <pattern id="map-quilt" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M0 0H100V100H0Z M0 50H100 M50 0V100" fill="none" stroke="#b65d8a" strokeWidth="4" opacity=".34" /><path d="M0 0L50 50L100 0 M0 100L50 50L100 100" fill="none" stroke="#fff5d8" strokeWidth="4" opacity=".65" /></pattern>
      <pattern id="map-waves" width="74" height="40" patternUnits="userSpaceOnUse"><path d="M0 18Q18 4 37 18T74 18" fill="none" stroke="#298db4" strokeWidth="5" opacity=".48" /></pattern>
    </defs>
    <rect width="1440" height="940" fill="#F8EBCB" />
    <rect width="1440" height="940" fill="url(#map-paper-dots)" />
    <path d="M55 54Q720 20 1386 54 M52 885Q720 919 1386 885" fill="none" stroke="#c5a875" strokeWidth="4" strokeDasharray="14 15" opacity=".55" />

    {/* Paper Pier: water and sand layers, dock, striped light tower, sailing boat. */}
    <g filter="url(#map-cut-shadow)">
      <path d="M148 250Q240 214 330 240Q435 200 555 262L574 426Q488 469 409 441Q304 476 237 443L145 452Q120 354 148 250Z" fill="#fff8e9" stroke="#fff" strokeWidth="20" />
      <path d="M148 250Q240 214 330 240Q435 200 555 262L574 426Q488 469 409 441Q304 476 237 443L145 452Q120 354 148 250Z" fill="#75CFE4" stroke="#3b4d69" strokeWidth="6" />
      <path d="M148 250Q240 214 330 240Q435 200 555 262L574 426Q488 469 409 441Q304 476 237 443L145 452Q120 354 148 250Z" fill="url(#map-waves)" stroke="none" />
      <path d="M144 250Q236 223 333 246Q433 212 552 265L552 300Q454 273 359 305Q252 286 155 321Z" fill="#F7D99F" stroke="#fff1cc" strokeWidth="5" />
      <path d="M202 349L392 349L392 371L202 371Z M225 371L225 415 M278 371L278 418 M340 371L340 411" fill="#D78A56" stroke="#583d47" strokeWidth="5" />
      <path d="M225 349V310L250 283L277 310V349Z" fill="#fff4db" stroke="#583d47" strokeWidth="5" />
      <path d="M239 291V268H261V291 M250 267L250 251" fill="none" stroke="#583d47" strokeWidth="5" />
      <path d="M226 312H277M226 327H277" stroke="#EC6B73" strokeWidth="10" />
      <path d="M241 343Q250 325 261 343" fill="#FFE793" stroke="#583d47" strokeWidth="4" />
      <path d="M399 385Q456 398 515 385L495 410Q448 428 414 409Z" fill="#fff1d0" stroke="#583d47" strokeWidth="5" />
      <path d="M450 386V331L481 375Z" fill="#FFF5DB" stroke="#583d47" strokeWidth="5" />
      <path d="M442 330L442 388" stroke="#583d47" strokeWidth="5" />
      <path d="M177 399Q187 390 197 399 M333 424Q343 415 353 424 M526 347Q536 338 546 347" fill="none" stroke="#fff" strokeWidth="5" />
    </g>

    {/* Doodle Grove: scalloped canopy, twisting trunks, a treehouse and mushrooms. */}
    <g filter="url(#map-cut-shadow)">
      <path d="M774 246Q789 206 852 214Q922 178 982 213Q1085 176 1179 245Q1225 294 1194 358Q1237 407 1180 451Q1078 475 1009 449Q907 482 831 450Q760 417 774 353Q747 299 774 246Z" fill="#fff9e7" stroke="#fff" strokeWidth="20" />
      <path d="M774 246Q789 206 852 214Q922 178 982 213Q1085 176 1179 245Q1225 294 1194 358Q1237 407 1180 451Q1078 475 1009 449Q907 482 831 450Q760 417 774 353Q747 299 774 246Z" fill="#9FD88D" stroke="#3e5d4b" strokeWidth="6" />
      <path d="M784 382Q955 425 1187 374L1180 448Q1053 466 1008 442Q879 473 813 440Z" fill="#6AB879" stroke="none" />
      <path d="M886 384L885 305 M885 344L855 319 M885 326L918 301 M1073 397L1073 300 M1073 344L1036 316 M1073 324L1111 296" fill="none" stroke="#74534A" strokeWidth="21" />
      <path d="M885 342C818 362 801 301 834 276Q820 230 862 220Q883 185 921 219Q969 217 968 268Q1012 311 958 338Q932 367 885 342Z" fill="#4EAE73" stroke="#315a4b" strokeWidth="6" />
      <path d="M1074 335Q1022 357 1002 314Q976 285 1008 253Q1005 221 1046 215Q1080 181 1115 213Q1162 217 1154 262Q1195 306 1144 331Q1111 355 1074 335Z" fill="#5FC182" stroke="#315a4b" strokeWidth="6" />
      <path d="M910 283L950 283L950 318L910 318Z" fill="#F9D78B" stroke="#563f45" strokeWidth="5" />
      <path d="M904 283L930 259L956 283Z" fill="#ED7377" stroke="#563f45" strokeWidth="5" />
      <circle cx="930" cy="299" r="7" fill="#8C5EB2" stroke="#563f45" strokeWidth="3" />
      <path d="M825 404Q842 381 860 404Z M1140 411Q1160 384 1180 411Z" fill="#E96D77" stroke="#563f45" strokeWidth="4" />
      <path d="M844 402V420 M1160 408V426" stroke="#fff1d3" strokeWidth="8" />
      {([[805,348],[980,395],[1021,425],[1173,365],[944,418]] as const).map(([x,y],i) => <g key={i}><path d={`M${x} ${y}v-12`} stroke="#315a4b" strokeWidth="3" /><circle cx={x} cy={y-15} r="5" fill={i%2 ? '#fff1a9' : '#ef82a4'} stroke="#315a4b" strokeWidth="2" /></g>)}
    </g>

    {/* Patchwork Plaza: quilted square, striped market, fountain and bunting. */}
    <g filter="url(#map-cut-shadow)">
      <path d="M151 563L237 538L316 555L402 532L551 570L548 770L456 782L359 759L257 783L149 758Z" fill="#fff9e9" stroke="#fff" strokeWidth="20" />
      <path d="M151 563L237 538L316 555L402 532L551 570L548 770L456 782L359 759L257 783L149 758Z" fill="#DDA3C6" stroke="#664d74" strokeWidth="6" />
      <path d="M170 565H534V755H170Z" fill="url(#map-quilt)" opacity=".86" stroke="none" />
      <path d="M230 705V624L255 596H450L475 624V705Z" fill="#FCEFCF" stroke="#644a61" strokeWidth="6" />
      <path d="M224 627L252 591H450L481 627Z" fill="#EE6F87" stroke="#644a61" strokeWidth="6" />
      <path d="M251 592V628 M291 592V628 M331 592V628 M371 592V628 M411 592V628 M451 592V628" stroke="#fff5dc" strokeWidth="13" />
      <path d="M275 657H422M275 679H422" stroke="#b57961" strokeWidth="6" />
      <path d="M193 674Q209 650 225 674L220 698H198Z" fill="#71C6D6" stroke="#644a61" strokeWidth="5" />
      <path d="M208 671Q204 649 196 645 M210 668Q219 648 225 645" fill="none" stroke="#71C6D6" strokeWidth="5" />
      <path d="M170 560Q335 514 518 564" fill="none" stroke="#644a61" strokeWidth="3" />
      {[185,232,279,326,373,420,467].map((x,i) => <path key={x} d={`M${x} ${557-(i%2)*12}l15 0l-8 20Z`} fill={i%3===0 ? '#FAD372' : i%3===1 ? '#75CFE4' : '#F47D86'} stroke="#644a61" strokeWidth="3" />)}
      <circle cx="495" cy="707" r="15" fill="#F8D77E" stroke="#644a61" strokeWidth="4" />
    </g>

    {/* Lantern Hill: terraced hills, winding stair, gazebo and hanging lights. */}
    <g filter="url(#map-cut-shadow)">
      <path d="M746 699Q808 607 886 642Q987 556 1064 620Q1157 602 1223 700L1213 789Q1103 808 1043 781Q928 821 858 781L748 790Z" fill="#fff9e7" stroke="#fff" strokeWidth="20" />
      <path d="M746 699Q808 607 886 642Q987 556 1064 620Q1157 602 1223 700L1213 789Q1103 808 1043 781Q928 821 858 781L748 790Z" fill="#F4B769" stroke="#835c5d" strokeWidth="6" />
      <path d="M752 739Q835 692 919 731Q1016 676 1113 724Q1187 697 1218 738V790Q1113 818 1042 785Q935 817 860 786L748 794Z" fill="#E89269" stroke="#835c5d" strokeWidth="5" />
      <path d="M775 780Q836 729 886 759T1008 741T1149 753" fill="none" stroke="#fff2cf" strokeWidth="23" />
      <path d="M775 780Q836 729 886 759T1008 741T1149 753" fill="none" stroke="#9e6b60" strokeWidth="3" strokeDasharray="8 13" />
      <path d="M989 662L1055 619L1122 662 M1002 662V722 H1109V662 M1016 683H1096" fill="#FFE9B3" stroke="#704c55" strokeWidth="6" />
      <path d="M989 662L1055 619L1122 662Z" fill="#D76675" stroke="#704c55" strokeWidth="6" />
      <circle cx="1055" cy="690" r="16" fill="#FFD76D" stroke="#704c55" strokeWidth="4" />
      <path d="M802 615Q978 564 1185 620" fill="none" stroke="#704c55" strokeWidth="4" />
      {([[830,610],[899,589],[971,582],[1040,584],[1111,601],[1170,614]] as const).map(([x,y],i) => <g key={i}><path d={`M${x} ${y}v30`} stroke="#704c55" strokeWidth="4" /><path d={`M${x-13} ${y+30}Q${x} ${y+13} ${x+13} ${y+30}L${x+9} ${y+51}H${x-9}Z`} fill={i%2 ? '#FFE59A' : '#F6CF74'} stroke="#704c55" strokeWidth="4" /></g>)}
      <path d="M800 700l8-16l8 16l-8 16Z M1170 677l7-14l7 14l-7 14Z" fill="#fff1b1" stroke="#835c5d" strokeWidth="3" />
    </g>

    {[
      { x: 330, y: 271, w: 204, title: 'PAPER PIER', colour: '#75CFE4' },
      { x: 865, y: 225, w: 228, title: 'DOODLE GROVE', colour: '#9FD88D' },
      { x: 232, y: 724, w: 250, title: 'PATCHWORK PLAZA', colour: '#DDA3C6' },
      { x: 850, y: 728, w: 228, title: 'LANTERN HILL', colour: '#F4B769' },
    ].map((d) => <g key={d.title} filter="url(#map-cut-shadow)">
      <path d={`M${d.x-12} ${d.y+7}l-18 12l18 12M${d.x+d.w+12} ${d.y+7}l18 12l-18 12`} fill={d.colour} stroke="#493747" strokeWidth="3" />
      <rect x={d.x} y={d.y} width={d.w} height="42" rx="10" fill="#FFF9E9" stroke="#493747" strokeWidth="4" />
      <text x={d.x+d.w/2} y={d.y+28} textAnchor="middle">{d.title}</text>
    </g>)}
  </g>;
}
