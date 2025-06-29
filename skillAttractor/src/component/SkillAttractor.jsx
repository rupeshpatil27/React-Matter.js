import { useLayoutEffect, useRef } from "react";
import Matter from "matter-js";
import MatterAttractors from "matter-attractors";
import MatterWrap from "matter-wrap";

Matter.use(MatterAttractors);
Matter.use(MatterWrap);

function SkillAttractor({ elementRefs, children }) {
    const containerRef = useRef(null);

    const BODY_OPTIONS = {
        mass: 0.2,
        restitution: 1,
        density: 0.01,
        friction: 0.1,
        frictionAir: 0.2,
        render: { visible: false },
    };

    const WALL_OPTIONS = {
        isStatic: true,
        label: "wall",
        restitution: 1, // high bounciness
        friction: 0,
        render: {
            visible: false,
        },
    };

    const WALL_THICKNESS = 200;
    const WALL_PADDING = 10;
    const ATTRACTOR_STRENGTH = 1e-6;
    const ATTRACTOR_RADIUS = 30;
    const FORCE_SCALE = 0.12;

    const randomPosition = (margin, max) => Matter.Common.random(margin, max - margin);

    function createCircle(ele, width, height) {
        const radius = Math.max(ele.width, ele.height) / 2;
        const margin = radius + 20;

        const x = randomPosition(margin, width);
        const y = randomPosition(margin, height);

        const body = Matter.Bodies.circle(
            x,
            y,
            radius,
            { ...BODY_OPTIONS, name: "image" }
        );

        Matter.Body.setVelocity(body, {
            x: Matter.Common.random(-1, 1),
            y: Matter.Common.random(-1, 1),
        });

        return body
    }

    const createPill = (el, width, height) => {
        var pillWidth = el.width;
        var pillHeight = el.height;
        var pillRadius = pillHeight / 2;

        const margin = pillWidth + 30; // safe margin from edges

        const x = randomPosition(margin, width);
        const y = randomPosition(margin, height);

        var leftCircle = Matter.Bodies.circle(
            x - pillWidth / 2 + pillRadius,
            y,
            pillRadius,
            BODY_OPTIONS
        );

        var rightCircle = Matter.Bodies.circle(
            x + pillWidth / 2 - pillRadius,
            y,
            pillRadius,
            BODY_OPTIONS
        );

        var rect = Matter.Bodies.rectangle(
            x,
            y,
            pillWidth - pillHeight,
            pillHeight,
            BODY_OPTIONS
        );

        const pill = Matter.Body.create({
            parts: [leftCircle, rightCircle, rect],
            ...BODY_OPTIONS,
            name: "text",
        });

        Matter.Body.setVelocity(pill, {
            x: Matter.Common.random(-1, 1),
            y: Matter.Common.random(-1, 1),
        });

        return pill;
    };

    const createAttractiveBody = (width, height) => {
        return Matter.Bodies.circle(randomPosition(ATTRACTOR_RADIUS, width / 2), randomPosition(ATTRACTOR_RADIUS, height / 2), ATTRACTOR_RADIUS, {
            isStatic: true,
            render: {
                fillStyle: `red`,
                strokeStyle: `#fff`,
                lineWidth: 0,
                resolution: 1
            },
            plugin: {
                attractors: [
                    (bodyA, bodyB) => {
                        return {
                            x: (bodyA.position.x - bodyB.position.x) * ATTRACTOR_STRENGTH,
                            y: (bodyA.position.y - bodyB.position.y) * ATTRACTOR_STRENGTH,
                        };
                    },
                ],
            },
        });
    };

    function createBoundaries(width, height) {

        return [
            Matter.Bodies.rectangle(
                width / 2,
                height + WALL_THICKNESS / 2 - WALL_PADDING,
                width,
                WALL_THICKNESS,
                WALL_OPTIONS
            ), //bottom

            Matter.Bodies.rectangle(
                -WALL_THICKNESS / 2 + WALL_PADDING,
                height / 2,
                WALL_THICKNESS,
                height,
                WALL_OPTIONS
            ), // Left
            Matter.Bodies.rectangle(
                width + WALL_THICKNESS / 2 - WALL_PADDING,
                height / 2,
                WALL_THICKNESS,
                height,
                WALL_OPTIONS
            ), // Right
            Matter.Bodies.rectangle(
                width / 2,
                -WALL_THICKNESS / 2 + WALL_PADDING,
                width,
                WALL_THICKNESS,
                WALL_OPTIONS
            ), // Top
        ];
    }

    const createMouseConstraint = (engine, render) => {
        const mouse = Matter.Mouse.create(render.canvas);
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

    const addTouchListeners = (mouseConstraint) => {

        const mouse = mouseConstraint.mouse;
        const element = mouse.element;

        // Remove default touch and wheel listeners
        element.removeEventListener("wheel", mouse.mousewheel);

        element.removeEventListener('touchstart', mouse.mousedown);
        element.removeEventListener('touchmove', mouse.mousemove);
        element.removeEventListener('touchend', mouse.mouseup);

        // Define the custom handlers
        const customTouchStart = (e) => {
            if (mouseConstraint.body) {
                e.preventDefault();
                mouse.mousedown(e);
            }
        };

        const customTouchMove = (e) => {
            if (mouseConstraint.body) {
                e.preventDefault();
                mouse.mousemove(e);
            }
        };

        const customTouchEnd = (e) => {
            if (mouseConstraint.body) {
                e.preventDefault();
                mouse.mouseup(e);
            }
        };

        element.addEventListener('touchstart', customTouchStart, { passive: false });
        element.addEventListener('touchmove', customTouchMove, { passive: false });
        element.addEventListener('touchend', customTouchEnd, { passive: false });

        return () => {
            element.removeEventListener('touchstart', customTouchStart);
            element.removeEventListener('touchmove', customTouchMove);
            element.removeEventListener('touchend', customTouchEnd);
        };
    };

    useLayoutEffect(() => {
        const canvasContainer = containerRef.current;
        if (!canvasContainer) return;

        const isReady = elementRefs.current.every((ref) => ref?.current);
        if (!isReady) return;

        let measuredSizes = elementRefs.current
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

        render.canvas.style.pointerEvents = "auto";

        const runner = Matter.Runner.create();
        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        const createBodies = () => {
            const { width, height } = getCanvasSize();
            return measuredSizes.map((el) => {
                let body;
                switch (el.objectType) {
                    case 'image':
                        body = createCircle(el, width, height);
                        break;
                    case 'text':
                    default:
                        body = createPill(el, width, height);
                }

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

        let bodiesStack = createBodies(w, h);
        Matter.Composite.add(world, bodiesStack);

        Matter.Composite.add(world, createBoundaries(w, h));

        let mouseConstraint = createMouseConstraint(engine, render);
        Matter.Composite.add(world, mouseConstraint);
        const removeTouchListeners = addTouchListeners(mouseConstraint);

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

            Matter.Body.translate(attractiveBody, {
                x: dx * FORCE_SCALE,
                y: dy * FORCE_SCALE,
            });

            updatePositions()
        };

        const resizeCanvas = () => {
            const { width, height } = getCanvasSize();

            measuredSizes = elementRefs.current
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

            removeCanvasListeners()
            // Clear the existing bodies
            Matter.Composite.clear(world, false);

            render.canvas.width = width;
            render.canvas.height = height;
            render.options.width = width;
            render.options.height = height;

            attractiveBody = createAttractiveBody(width, height)
            Matter.Composite.add(world, attractiveBody);

            bodiesStack = createBodies(width, height);
            Matter.Composite.add(world, bodiesStack);

            Matter.Composite.add(world, createBoundaries(width, height));

            if (mouseConstraint) {
                Matter.Composite.remove(world, mouseConstraint);
                removeTouchListeners();
            }
            mouseConstraint = createMouseConstraint(engine, render);
            Matter.Composite.add(world, mouseConstraint);
            addTouchListeners(mouseConstraint);

            addCanvasListeners()
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

        const addCanvasListeners = () => {
            render.canvas.addEventListener("mouseleave", pauseEngine);
            render.canvas.addEventListener("mouseenter", resumeEngine);
        };

        const removeCanvasListeners = () => {
            render.canvas.removeEventListener("mouseleave", pauseEngine);
            render.canvas.removeEventListener("mouseenter", resumeEngine);
        };

        addCanvasListeners()

        return () => {
            window.removeEventListener("resize", debouncedResize);
            removeCanvasListeners()
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
        <div className="w-full h-full relative">
            <div
                className="absolute inset-0 pointer-events-none"
                ref={containerRef}
            />

            <div className="absolute inset-0 z-10 pointer-events-none">
                {children}
            </div>
        </div>
    );
}

export default SkillAttractor