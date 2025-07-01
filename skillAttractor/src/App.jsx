import React, { useRef } from "react";
import ParticleAttractor from "./component/ParticleAttractor";

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
    { text: 'API Integration', image: null },
  ];

  const elementRefs = useRef(SkillsData.map(() => React.createRef()));

  return (
    <>
      <div className="w-full h-screen relative">
        <h1 className="block absolute inset-x-0 top-1/2 text-4xl font-extrabold text-center z-30 pointer-events-none text-white-50">
          Particles Attractors
        </h1>

        <div className="w-full h-full relative">
          <ParticleAttractor elementRefs={elementRefs}>
            {SkillsData.map((item, i) =>

              item.image && !item.text ? (
                <img
                  ref={elementRefs.current[i]}
                  key={`img-${i}`}
                  className={`absolute size-12 md:size-15 select-none will-change-transform ${item.color === '#fff' ? 'filter invert' : ''}`}
                  src={item.image}
                />
              ) : (
                <div
                  ref={elementRefs.current[i]}
                  key={`text-${i}`}
                  className="absolute px-4 py-1 text-[13px] whitespace-nowrap md:text-lg text-white-50 text-center rounded-4xl ring ring-gray-600 font-extralight bg-black-200 select-none will-change-transform"
                >
                  {item.text}
                </div>
              )
            )}
          </ParticleAttractor>
        </div>
      </div>
    </>
  );
}

export default App;
