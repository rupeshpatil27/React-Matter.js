import React, { useRef } from "react";
import ParticleBounce from "./component/ParticleBounce";

function App() {

  const SkillsData = [
    { text: null, image: '/github.svg', color: "#fff" },
    { text: null, image: '/git.svg' },
    { text: null, image: '/react.svg' },
    { text: null, image: '/javascript.svg' },
    { text: null, image: '/figma.svg' },
    { text: null, image: '/css3.svg' },
    { text: null, image: '/html5.svg' },
    { text: null, image: '/mysql.svg' },
    { text: null, image: '/node.svg' },
    { text: null, image: '/tailwindcss.svg' },
    { text: null, image: '/threejs.svg', color: "#fff" },
    { text: null, image: '/postman.svg' },
    { text: 'Redux', image: null },
    { text: 'jQuery', image: null },
    { text: 'Bootstrap', image: null },
    { text: 'AngularJS', image: null },
    { text: 'React Native', image: null },
    { text: 'RESTful APIs', image: null },
    { text: 'AJAX', image: null },
    { text: 'API Integration', image: null },
  ];

  const elementRefs = useRef(SkillsData.map(() => React.createRef()));

  return (
    <>
      <div className="w-full h-screen relative grid place-items-center px-10 py-10">

        <div className="w-full h-[30rem] bg-gradient-to-b from-midnight to-navy rounded-2xl relative overflow-hidden">
          <h1 className="block absolute inset-x-0 top-1/2 text-4xl font-extrabold text-center z-[9] pointer-events-none text-white-50">
            Particles Bounce
          </h1>
          <ParticleBounce elementRefs={elementRefs}>
            {SkillsData.map((item, i) =>

              item.image && !item.text ? (
                <img
                  ref={elementRefs.current[i]}
                  key={`img-${i}`}
                  draggable={false}
                  className={`absolute size-12 md:size-15 select-none pointer-events-auto cursor-grab will-change-transform ${item.color === '#fff' ? 'filter invert' : ''}`}
                  src={item.image}
                />
              ) : (
                <div
                  ref={elementRefs.current[i]}
                  key={`text-${i}`}
                  className="absolute px-4 py-1 text-[13px] whitespace-nowrap md:text-lg text-white-50 text-center rounded-4xl ring ring-gray-600 font-extralight bg-midnight select-none pointer-events-auto cursor-grab will-change-transform"
                >
                  {item.text}
                </div>
              )
            )}
          </ParticleBounce>
        </div>
      </div >
    </>
  );
}


export default App;
