import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

// 트랙(가로 36px) 안쪽에 p-0.5(2px씩) 패딩을 둬서 실제 손잡이가 움직일 수 있는
// 내부 폭이 정확히 손잡이 크기(16px)의 2배(32px)가 되도록 맞췄다. 이러면
// 활성화 시 translate-x-full(손잡이 자기 폭의 100%만큼 이동)이 별도 calc()
// 없이도 항상 내부 오른쪽 끝에 정확히 맞아떨어진다.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 shadow-xs transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background pointer-events-none block size-4 rounded-full shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-full data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
