import { useLayoutEffect, useRef } from "react";
import Matter from "matter-js";
import MatterAttractors from "matter-attractors";
import MatterWrap from "matter-wrap";

Matter.use(MatterAttractors);
Matter.use(MatterWrap);

function SkillAttractor({ elementRefs, children }) {
    const containerRef = useRef(null);

    const physicsOptions = {
        mass: 0.2,
        restitution: 1,
        density: 0.01,
        friction: 0.1,
        frictionAir: 0.2,
        render: { visible: false },
    };

    function createCircle(ele, canvasWidth, canvasHeight) {
        const radius = Math.max(ele.width, ele.height) / 2;
        const margin = radius + 20;

        const x = Matter.Common.random(margin, canvasWidth - margin);
        const y = Matter.Common.random(margin, canvasHeight - margin);

        const body = Matter.Bodies.circle(
            x,
            y,
            radius,
            { ...physicsOptions, name: "image" }
        );

        Matter.Body.setVelocity(body, {
            x: Matter.Common.random(-1, 1),
            y: Matter.Common.random(-1, 1),
        });

        return body
    }

    const createPill = (element, width, height) => {
        var pillWidth = element.width;
        var pillHeight = element.height;
        var pillRadius = pillHeight / 2;

        const margin = pillWidth + 30; // safe margin from edges

        const pillPosX = Matter.Common.random(margin, width - margin);
        const pillPosY = Matter.Common.random(margin, height - margin);

        var leftCircle = Matter.Bodies.circle(
            pillPosX - pillWidth / 2 + pillRadius,
            pillPosY,
            pillRadius,
            physicsOptions
        );

        var rightCircle = Matter.Bodies.circle(
            pillPosX + pillWidth / 2 - pillRadius,
            pillPosY,
            pillRadius,
            physicsOptions
        );

        var rect = Matter.Bodies.rectangle(
            pillPosX,
            pillPosY,
            pillWidth - pillHeight,
            pillHeight,
            physicsOptions
        );

        const pill = Matter.Body.create({
            parts: [leftCircle, rightCircle, rect],
            ...physicsOptions,
            name: "text",
        });

        Matter.Body.setVelocity(pill, {
            x: Matter.Common.random(-1, 1),
            y: Matter.Common.random(-1, 1),
        });

        return pill;
    };

    function createBoundaries(width, height) {
        const wallThickness = 200;
        const wallPadding = 10;

        const options = {
            isStatic: true,
            label: "wall",
            restitution: 1, // high bounciness
            friction: 0,
            render: {
                visible: false,
            },
        };

        return [
            Matter.Bodies.rectangle(
                width / 2,
                height + wallThickness / 2 - wallPadding,
                width,
                wallThickness,
                options
            ), //bottom

            Matter.Bodies.rectangle(
                -wallThickness / 2 + wallPadding,
                height / 2,
                wallThickness,
                height,
                options
            ), // Left
            Matter.Bodies.rectangle(
                width + wallThickness / 2 - wallPadding,
                height / 2,
                wallThickness,
                height,
                options
            ), // Right
            Matter.Bodies.rectangle(
                width / 2,
                -wallThickness / 2 + wallPadding,
                width,
                wallThickness,
                options
            ), // Top
        ];
    }

    const createMouseConstraint = (engine, render) => {
        const mouse = Matter.Mouse.create(render.canvas);
        mouse.element = containerRef.current
        const constraint = Matter.MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false },
            },
        });
        render.mouse = mouse;
        return constraint;
    };

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    useLayoutEffect(() => {
        const canvasContainer = containerRef.current;
        if (!canvasContainer) return;

        const isReady = elementRefs.current.every((ref) => ref?.current);
        if (!isReady) return;

        const measuredSizes = elementRefs.current
            .map((ref, i) => {
                const element = ref.current;
                const { offsetWidth, offsetHeight, offsetLeft, offsetTop } = element;
                return {
                    width: offsetWidth,
                    height: offsetHeight,
                    left: offsetLeft,
                    top: offsetTop,
                    objectType: element.nodeName === "IMG" ? "image" : "text",
                };
            })
            .filter(Boolean);

        const getCanvasSize = () => ({
            width: canvasContainer?.offsetWidth,
            height: canvasContainer?.offsetHeight,
        });

        var engine = Matter.Engine.create();
        const world = engine.world;

        engine.gravity.y = 0;
        engine.gravity.x = 0;
        engine.gravity.scale = 0;

        const render = Matter.Render.create({
            element: canvasContainer,
            engine,
            options: {
                ...getCanvasSize(),
                wireframes: false,
                background: "transparent",
            },
        });

        // render.canvas.style.pointerEvents = "none";

        const runner = Matter.Runner.create();
        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        const createAttractiveBody = (width, height) => {
            const radius = 30
            const strength = 1e-6;

            return Matter.Bodies.circle(Matter.Common.random(radius, width / 2), Matter.Common.random(radius, height / 2), radius, {
                isStatic: true,
                render: {
                    fillStyle: `#000`,
                    strokeStyle: `#000`,
                    lineWidth: 0,
                },
                plugin: {
                    attractors: [
                        (bodyA, bodyB) => {
                            return {
                                x: (bodyA.position.x - bodyB.position.x) * strength,
                                y: (bodyA.position.y - bodyB.position.y) * strength,
                            };
                        },
                    ],
                },
            });
        };

        const createBodies = () => {
            const { width, height } = getCanvasSize();

            console.log(width)
            return measuredSizes.map((el) => {
                const body =
                    el.objectType === "image"
                        ? createCircle(el, width, height)
                        : createPill(el, width, height);
                body.plugin.wrap = {
                    min: { x: 0, y: 0 },
                    max: { x: width, y: height },
                };
                return body;
            });
        };

        const { width: w, height: h } = getCanvasSize();

        let attractiveBody = createAttractiveBody(w, h)
        Matter.Composite.add(world, attractiveBody);

        let bodiesStack = createBodies();
        Matter.Composite.add(world, bodiesStack);

        Matter.Composite.add(world, createBoundaries(w, h));

        let mouseConstraint = createMouseConstraint(engine, render);
        Matter.Composite.add(world, mouseConstraint);


        let ticking = false;
        const updatePositions = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    bodiesStack.forEach((body, i) => {
                        const el = elementRefs.current[i]?.current;
                        if (!el) return;
                        el.style.left = `${body.position.x - el.offsetWidth / 2}px`;
                        el.style.top = `${body.position.y - el.offsetHeight / 2}px`;
                        el.style.transform = `rotate(${body.angle}rad)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        };

        const afterUpdateHandler = () => {
            const dx = mouseConstraint.mouse.position.x - attractiveBody.position.x;
            const dy = mouseConstraint.mouse.position.y - attractiveBody.position.y;

            const forceScale = 0.12;
            Matter.Body.translate(attractiveBody, {
                x: dx * forceScale,
                y: dy * forceScale,
            });
            updatePositions()
        };

        const resizeCanvas = () => {
            const { width, height } = getCanvasSize();

            // Clear the existing bodies
            Matter.Runner.stop(runner);
            Matter.Composite.clear(world, false);

            render.canvas.width = width;
            render.canvas.height = height;
            render.options.width = width;
            render.options.height = height;

            attractiveBody = createAttractiveBody(width, height)
            Matter.Composite.add(world, attractiveBody);

            bodiesStack = createBodies();
            Matter.Composite.add(world, bodiesStack);

            Matter.Composite.add(world, createBoundaries(width, height));

            if (mouseConstraint) Composite.remove(world, mouseConstraint);
            mouseConstraint = createMouseConstraint(engine, render);
            Matter.Composite.add(world, mouseConstraint);

            Matter.Runner.run(runner, engine);
        };

        const debouncedResize = debounce(resizeCanvas, 300);
        window.addEventListener("resize", debouncedResize);


        let isRunning = true;

        function pauseEngine() {
            if (isRunning) {
                Matter.Runner.stop(runner);
                isRunning = false;
            }
        }

        function resumeEngine() {
            if (!isRunning) {
                Matter.Runner.run(runner, engine);
                isRunning = true;
            }
        }

        Matter.Events.on(engine, "afterUpdate", afterUpdateHandler);

        containerRef.current.addEventListener("mouseleave", pauseEngine);
        containerRef.current.addEventListener("mouseenter", resumeEngine);

        return () => {
            window.removeEventListener("resize", debouncedResize);
            containerRef.current.removeEventListener("mouseleave", pauseEngine);
            containerRef.current.removeEventListener("mouseenter", resumeEngine);
            Matter.Events.off(engine, "afterUpdate", afterUpdateHandler);
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            Matter.Composite.clear(world);
            Matter.Engine.clear(engine);
            if (render.canvas.parentNode) {
                render.canvas.parentNode.removeChild(render.canvas);
            }
            render.canvas = null;
            render.context = null;
            render.textures = {};
        };
    }, [elementRefs]);

    return (
        <div className="w-full h-full relative select-none">
            <div
                className="absolute inset-0"
                ref={containerRef}
            />

            <div className="absolute inset-0 z-10 pointer-events-none">
                {children}
            </div>
        </div>
    );
}

export default SkillAttractor